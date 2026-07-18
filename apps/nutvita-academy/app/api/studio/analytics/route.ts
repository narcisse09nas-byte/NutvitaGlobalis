import { isSupabaseConfigured } from "@/lib/env";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ error: "Supabase non configure." }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  const selectedRole = (await cookies()).get("nutvita_active_role")?.value;
  const effectiveRole = selectedRole === "instructor" || selectedRole === "admin" ? selectedRole : profile?.role;
  if (!profile || !["instructor", "admin", "super_admin"].includes(effectiveRole ?? ""))
    return Response.json({ error: "Acces Studio refuse." }, { status: 403 });

  const admin = createSupabaseAdminClient();
  let courseQuery = admin.from("courses").select("id,title,slug,instructor_user_id").order("title");
  if (effectiveRole === "instructor") courseQuery = courseQuery.eq("instructor_user_id", auth.user.id);
  const { data: courses, error: courseError } = await courseQuery;
  if (courseError) return Response.json({ error: courseError.message }, { status: 500 });
  const courseIds = (courses ?? []).map((course) => course.id);
  if (courseIds.length === 0) return Response.json({ courses: [], learners: [] });

  const [{ data: enrollments, error: enrollmentError }, { data: modules }, { data: certificates }] = await Promise.all([
    admin.from("enrollments").select("course_id,user_id,enrolled_at,completed_at").in("course_id", courseIds),
    admin.from("course_modules").select("id,course_id").in("course_id", courseIds),
    admin.from("certificates").select("course_id,user_id,status,final_score,issued_at").in("course_id", courseIds),
  ]);
  if (enrollmentError) return Response.json({ error: enrollmentError.message }, { status: 500 });
  const moduleIds = (modules ?? []).map((item) => item.id);
  const { data: lessons } = moduleIds.length
    ? await admin.from("lessons").select("id,module_id").in("module_id", moduleIds)
    : { data: [] };
  const userIds = [...new Set((enrollments ?? []).map((item) => item.user_id))];
  const lessonIds = (lessons ?? []).map((item) => item.id);
  const [{ data: people }, { data: progress }] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id,full_name,email").in("id", userIds) : Promise.resolve({ data: [] }),
    userIds.length && lessonIds.length
      ? admin.from("lesson_progress").select("user_id,lesson_id,status,progress_percent,last_visited_at,completed_at").in("user_id", userIds).in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] }),
  ]);
  const courseById = new Map((courses ?? []).map((item) => [item.id, item]));
  const personById = new Map((people ?? []).map((item) => [item.id, item]));
  const courseForLesson = new Map<string, string>();
  const moduleCourse = new Map((modules ?? []).map((item) => [item.id, item.course_id]));
  for (const lesson of lessons ?? []) courseForLesson.set(lesson.id, moduleCourse.get(lesson.module_id) ?? "");

  const learners = (enrollments ?? []).map((enrollment) => {
    const relevantLessons = lessonIds.filter((id) => courseForLesson.get(id) === enrollment.course_id);
    const relevantProgress = (progress ?? []).filter((item) => item.user_id === enrollment.user_id && relevantLessons.includes(item.lesson_id));
    const completed = relevantProgress.filter((item) => item.completed_at || item.status === "completed" || item.progress_percent === 100).length;
    const certificate = (certificates ?? []).find((item) => item.course_id === enrollment.course_id && item.user_id === enrollment.user_id && item.status === "valid");
    const percent = enrollment.completed_at ? 100 : relevantLessons.length ? Math.round((completed / relevantLessons.length) * 100) : 0;
    const person = personById.get(enrollment.user_id);
    return {
      userId: enrollment.user_id, courseId: enrollment.course_id,
      courseTitle: courseById.get(enrollment.course_id)?.title ?? "Formation",
      fullName: person?.full_name ?? person?.email ?? "Apprenant", email: person?.email ?? "",
      enrolledAt: enrollment.enrolled_at, lastActivityAt: relevantProgress.map((item) => item.last_visited_at).sort().at(-1) ?? null,
      progressPercent: percent, graduated: Boolean(certificate || enrollment.completed_at),
      certificateIssuedAt: certificate?.issued_at ?? null, finalScore: certificate?.final_score ?? null,
    };
  });
  return Response.json({
    courses: (courses ?? []).map((course) => ({
      id: course.id, title: course.title,
      enrolledCount: learners.filter((item) => item.courseId === course.id).length,
      graduatedCount: learners.filter((item) => item.courseId === course.id && item.graduated).length,
    })),
    learners,
  });
}
