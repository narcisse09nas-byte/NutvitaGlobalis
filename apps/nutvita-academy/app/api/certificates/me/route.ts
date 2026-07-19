import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ items: [] });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ items: [] }, { status: 401 });
  const { data, error } = await supabase
    .from("certificates")
    .select("id,certificate_number,status,final_score,issued_at,metadata,courses(slug,code,title),profiles(full_name,email)")
    .eq("user_id", auth.user.id)
    .neq("status", "revoked")
    .order("issued_at", { ascending: false });
  if (error) return Response.json({ items: [], error: error.message }, { status: 500 });
  return Response.json({ items: (data ?? []).map((row) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      certificateNumber: row.certificate_number,
      userId: auth.user.id,
      recipientName: profile?.full_name ?? auth.user.user_metadata.full_name ?? auth.user.email ?? "Apprenant",
      recipientEmail: profile?.email ?? auth.user.email ?? "",
      courseSlug: course?.slug ?? "formation",
      courseCode: course?.code ?? "NVGA",
      courseTitle: course?.title ?? "Formation NutVitaGlobalis Academy",
      courseTitleFr: course?.title ?? "Formation NutVitaGlobalis Academy",
      issueDate: row.issued_at,
      status: row.status,
      finalScore: Number(row.final_score),
      verificationPath: `/certificates/verify/${row.certificate_number}`,
      academicDirector: "Direction academique NutVitaGlobalis",
      createdAt: row.issued_at,
    };
  }) });
}
