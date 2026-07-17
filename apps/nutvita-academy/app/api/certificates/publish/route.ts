import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (!actor || !["admin", "super_admin"].includes(actor.role)) return Response.json({ error: "Validation administrative requise." }, { status: 403 });
  const body = await request.json().catch(() => null) as { candidateEmail?: string; courseSlug?: string; finalScore?: number; conductRating?: "good" | "passable"; attemptId?: string } | null;
  const finalScore = Number(body?.finalScore);
  if (!body?.candidateEmail || !body.courseSlug || !body.attemptId || !["good", "passable"].includes(body.conductRating ?? "") || !Number.isFinite(finalScore) || finalScore < 70 || finalScore > 100) return Response.json({ error: apiText(request, "Données de certificat ou décision de surveillance invalides.", "Invalid certificate data or proctoring decision.") }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const [{ data: candidate }, { data: course }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").eq("email", body.candidateEmail.toLowerCase()).single(),
    admin.from("courses").select("id, code, title").eq("slug", body.courseSlug).eq("status", "published").single(),
  ]);
  if (!candidate || !course) return Response.json({ error: "Candidat ou formation introuvable." }, { status: 404 });
  const { data: enrollment } = await admin.from("enrollments").select("id").eq("user_id", candidate.id).eq("course_id", course.id).single();
  if (!enrollment) return Response.json({ error: apiText(request, "Le candidat n’est pas inscrit à cette formation.", "The candidate is not enrolled in this course.") }, { status: 409 });
  const { data: existing } = await admin.from("certificates").select("certificate_number").eq("user_id", candidate.id).eq("course_id", course.id).neq("status", "revoked").maybeSingle();
  if (existing) return Response.json({ certificateNumber: existing.certificate_number, verificationPath: `/verify/${existing.certificate_number}` });
  const certificateNumber = `${String(course.code).toUpperCase()}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { error } = await admin.from("certificates").insert({ certificate_number: certificateNumber, user_id: candidate.id, course_id: course.id, status: "valid", final_score: finalScore, metadata: { integrity_reviewed_by: auth.user.id, conduct_rating: body.conductRating, exam_attempt_id: body.attemptId, publication_source: "examiner_cockpit" } });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({ actor_user_id: auth.user.id, action: "certificate.published", entity_type: "certificate", metadata: { certificate_number: certificateNumber, candidate_id: candidate.id, course_id: course.id } });
  return Response.json({ certificateNumber, verificationPath: `/verify/${certificateNumber}` }, { status: 201 });
}
