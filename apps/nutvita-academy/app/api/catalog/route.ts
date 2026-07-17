import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const [{ data: courses, error }, { data: enrollments }] = await Promise.all([
    supabase.from("courses").select("id, slug, code, title, description, price_usd, instructor_user_id, status, course_modules(id, lessons(id, duration_minutes))").eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("enrollments").select("course_id").eq("user_id", auth.user.id),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    enrolledCourseIds: (enrollments ?? []).map((item) => item.course_id),
    courses: (courses ?? []).map((course) => {
      const modules = Array.isArray(course.course_modules) ? course.course_modules : [];
      const lessons = modules.flatMap((module) => Array.isArray(module.lessons) ? module.lessons : []);
      return { id: course.id, slug: course.slug, code: course.code, title: course.title, subtitle: course.title, description: course.description, category: apiText(request, "Formation certifiante", "Certification course"), language: apiText(request, "Français", "French"), level: "professional", instructorId: course.instructor_user_id, instructorName: "NutVitaGlobalis Faculty", priceUsd: Number(course.price_usd), rating: 0, reviewCount: 0, studentCount: 0, durationHours: Math.max(1, Math.ceil(lessons.reduce((total, lesson) => total + Number(lesson.duration_minutes ?? 0), 0) / 60)), lessonsCount: lessons.length, featured: false, published: true };
    }),
  });
}
