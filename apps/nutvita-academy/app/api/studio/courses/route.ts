import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { StudioCourse } from "@/types/instructor-studio";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mergeLegacyStudioCourses } from "@/data/legacy-studio-courses";

export async function GET(request: Request) {
  if (!isSupabaseConfigured())
    return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return Response.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  const selectedRole = (await cookies()).get("nutvita_active_role")?.value;
  const effectiveRole = selectedRole === "instructor" || selectedRole === "admin" ? selectedRole : currentProfile?.role;
  if (!effectiveRole || !["instructor", "admin", "super_admin"].includes(effectiveRole))
    return Response.json({ error: "Acces Studio refuse." }, { status: 403 });

  const directory = new URL(request.url).searchParams.get("directory");
  if (directory === "instructors") {
    const profile = { role: effectiveRole };
    if (!profile || !["admin", "super_admin"].includes(profile.role))
      return Response.json({ error: "Acces administrateur requis." }, { status: 403 });
    const admin = createSupabaseAdminClient();
    const { data: instructors, error: directoryError } = await admin
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["instructor", "admin", "super_admin"])
      .order("full_name");
    if (directoryError)
      return Response.json({ error: directoryError.message }, { status: 500 });
    return Response.json({ instructors: instructors ?? [] });
  }

  let courseQuery = supabase
    .from("courses")
    .select(
      "id, status, instructor_user_id, created_at, updated_at, studio_payload",
    )
    .order("updated_at", { ascending: false });
  if (effectiveRole === "instructor") courseQuery = courseQuery.eq("instructor_user_id", auth.user.id);
  const { data, error } = await courseQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const courses = (data ?? []).flatMap((row) => {
    const payload = row.studio_payload as Partial<StudioCourse> | null;
    if (!payload?.slug || (!payload.title && !payload.titleEn)) return [];
    return [
      {
        ...payload,
        id: row.id,
        status: row.status,
        instructorUserId: row.instructor_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as StudioCourse,
    ];
  });
  return Response.json({ version: 4, courses: mergeLegacyStudioCourses(courses) });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return Response.json(
      { error: "Authentification Supabase requise." },
      { status: 401 },
    );
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  const selectedRole = (await cookies()).get("nutvita_active_role")?.value;
  const effectiveRole = selectedRole === "instructor" || selectedRole === "admin" ? selectedRole : profile?.role;

  if (
    !profile ||
    !["instructor", "admin", "super_admin"].includes(effectiveRole ?? "")
  )
    return Response.json({ error: apiText(request, "Accès Studio refusé.", "Studio access denied.") }, { status: 403 });
  const course = (await request
    .json()
    .catch(() => null)) as StudioCourse | null;
  if (!course?.slug || (!course.title && !course.titleEn) || !course.code)
    return Response.json({ error: "Formation invalide." }, { status: 400 });
  if (
    course.status === "published" &&
    !["admin", "super_admin"].includes(effectiveRole ?? "")
  )
    return Response.json(
      { error: "Seul un administrateur peut publier." },
      { status: 403 },
    );

  const { data: existing } = await supabase
    .from("courses")
    .select("id, instructor_user_id, studio_payload")
    .eq("slug", course.slug)
    .maybeSingle();
  if (
    existing &&
    existing.instructor_user_id !== auth.user.id &&
    !["admin", "super_admin"].includes(effectiveRole ?? "")
  )
    return Response.json(
      { error: apiText(request, "Formation gérée par un autre formateur.", "Course managed by another instructor.") },
      { status: 403 },
    );
  const isAdministrator = ["admin", "super_admin"].includes(effectiveRole ?? "");
  const previousPayload = existing?.studio_payload as Partial<StudioCourse> | null | undefined;
  const buildApproved = isAdministrator ? course.buildApproved : Boolean(previousPayload?.buildApproved);
  if (!buildApproved && course.modules.length > 0)
    return Response.json({ error: "Validation administrative requise avant la construction des modules." }, { status: 403 });
  const synchronizedCourse = { ...course, buildApproved };

  const values = {
    slug: course.slug,
    code: course.code,
    title: course.title || course.titleEn,
    description: course.description || course.descriptionEn,
    status: course.status,
    price_usd: course.priceUsd,
    instructor_user_id: isAdministrator && course.instructorUserId ? course.instructorUserId : existing?.instructor_user_id ?? auth.user.id,
    studio_payload: synchronizedCourse,
  };
  const result = existing
    ? await supabase
        .from("courses")
        .update(values)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await supabase.from("courses").insert(values).select("id").single();
  if (result.error || !result.data)
    return Response.json(
      { error: result.error?.message ?? "Synchronisation impossible." },
      { status: 500 },
    );
  const courseId = result.data.id;
  const { error: deleteError } = await supabase
    .from("course_modules")
    .delete()
    .eq("course_id", courseId);
  if (deleteError)
    return Response.json({ error: deleteError.message }, { status: 500 });
  for (
    let moduleIndex = 0;
    moduleIndex < course.modules.length;
    moduleIndex += 1
  ) {
    const courseModule = course.modules[moduleIndex];
    const { data: savedModule, error: moduleError } = await supabase
      .from("course_modules")
      .insert({
        course_id: courseId,
        title: courseModule.title || courseModule.titleEn,
        slug: courseModule.slug,
        position: moduleIndex,
      })
      .select("id")
      .single();
    if (moduleError || !savedModule)
      return Response.json(
        { error: moduleError?.message ?? apiText(request, "Module non synchronisé.", "Module not synchronized.") },
        { status: 500 },
      );
    if (courseModule.lessons.length > 0) {
      const { error: lessonError } = await supabase.from("lessons").insert(
        courseModule.lessons.map((lesson, lessonIndex) => ({
          module_id: savedModule.id,
          title: lesson.title || lesson.titleEn,
          slug: lesson.slug,
          lesson_type: lesson.type,
          content: {
            fr: {
              title: lesson.title,
              text: lesson.content,
              videoUrl: lesson.videoUrl,
              htmlUrl: lesson.htmlUrl,
              resourceUrl: lesson.resourceUrl,
            },
            en: {
              title: lesson.titleEn,
              text: lesson.contentEn,
              videoUrl: lesson.videoUrlEn,
              htmlUrl: lesson.htmlUrlEn,
              resourceUrl: lesson.resourceUrlEn,
            },
          },
          position: lessonIndex,
          duration_minutes: lesson.durationMinutes,
        })),
      );
      if (lessonError)
        return Response.json({ error: lessonError.message }, { status: 500 });
    }
  }
  const admin = createSupabaseAdminClient();
  const durationMinutes = course.modules.reduce((total, item) => total + item.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0), 0);
  const publicCourse = {
    academy_course_id: courseId,
    source: "academy",
    title: course.title || course.titleEn,
    title_en: course.titleEn || null,
    short_description: course.subtitle || course.description.slice(0, 220),
    short_description_en: course.subtitleEn || course.descriptionEn?.slice(0, 220) || null,
    description: course.description || course.descriptionEn,
    description_en: course.descriptionEn || null,
    duration: `${Math.max(1, Math.ceil(durationMinutes / 60))} h`,
    level: course.level,
    price: Math.round(Number(course.priceUsd || 0) * Number(process.env.NEXT_PUBLIC_XOF_PER_USD || 600)),
    moodle_url: `/academy/dashboard/marketplace/${course.slug}`,
    category: course.category,
    status: course.status === "published" ? "published" : "draft",
    featured: course.status === "published",
    publication_locale_status: course.contentLanguages.length === 2 ? "both" : course.contentLanguages[0] || "fr",
  };
  const { error: catalogError } = await admin.from("formations").upsert(publicCourse, { onConflict: "academy_course_id" });
  if (catalogError) return Response.json({ error: `Formation enregistrée, mais synchronisation du catalogue impossible : ${catalogError.message}` }, { status: 500 });
  return Response.json({ id: courseId, synchronized: true });
}
