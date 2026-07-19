import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";
import { sendCertificationEmail } from "@/lib/certification-email";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configure.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (!actor || !["admin", "super_admin"].includes(actor.role)) return Response.json({ error: "Validation administrative requise." }, { status: 403 });
  const body = await request.json().catch(() => null) as { candidateEmail?: string; courseSlug?: string; finalScore?: number; conductRating?: "good" | "passable" | "poor"; attemptId?: string; failureMessage?: string } | null;
  const finalScore = Number(body?.finalScore);
  if (!body?.candidateEmail || !body.courseSlug || !body.attemptId || !["good", "passable", "poor"].includes(body.conductRating ?? "") || !Number.isFinite(finalScore) || finalScore < 0 || finalScore > 100) return Response.json({ error: apiText(request, "Donnees de decision invalides.", "Invalid decision data.") }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const [{ data: candidate }, { data: course }] = await Promise.all([
    admin.from("profiles").select("id,full_name,email").eq("email", body.candidateEmail.toLowerCase()).single(),
    admin.from("courses").select("id,code,title").eq("slug", body.courseSlug).eq("status", "published").single(),
  ]);
  if (!candidate || !course) return Response.json({ error: "Candidat ou formation introuvable." }, { status: 404 });
  const certified = finalScore >= 70 && (body.conductRating === "good" || body.conductRating === "passable");
  let certificateNumber: string | undefined;
  let verificationPath: string | undefined;
  if (certified) {
    const { data: enrollment } = await admin.from("enrollments").select("id").eq("user_id", candidate.id).eq("course_id", course.id).single();
    if (!enrollment) return Response.json({ error: apiText(request, "Le candidat n'est pas inscrit a cette formation.", "The candidate is not enrolled in this course.") }, { status: 409 });
    const { data: existing } = await admin.from("certificates").select("certificate_number").eq("user_id", candidate.id).eq("course_id", course.id).neq("status", "revoked").maybeSingle();
    certificateNumber = existing?.certificate_number ?? `${String(course.code).toUpperCase()}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    if (!existing) {
      const { error } = await admin.from("certificates").insert({ certificate_number: certificateNumber, user_id: candidate.id, course_id: course.id, status: "valid", final_score: finalScore, metadata: { integrity_reviewed_by: auth.user.id, conduct_rating: body.conductRating, exam_attempt_id: body.attemptId, publication_source: "examiner_cockpit" } });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    verificationPath = `/certificates/verify/${certificateNumber}`;
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const actionUrl = certified ? `${siteUrl}${verificationPath}` : `${siteUrl}/dashboard/exams`;
  const title = certified ? "Felicitations, votre certificat est disponible !" : "Decision de certification disponible";
  const message = certified
    ? `Felicitations ${candidate.full_name} ! Votre note finale est de ${finalScore} %. Le surveillant a valide le deroulement de votre test. Votre certificat est disponible et verifiable publiquement.`
    : (body.failureMessage || `${candidate.full_name}, votre note finale est de ${finalScore} %. La certification n'est pas delivree pour cette tentative. Consultez votre espace pour les details et les prochaines possibilites.`);
  const eventKey = `certification-decision-${body.attemptId}`;
  const notification = await admin.from("academy_notifications").upsert({ user_id: candidate.id, event_key: eventKey, type: certified ? "certificate" : "exam", priority: "high", title, title_en: certified ? "Congratulations, your certificate is available!" : "Certification decision available", message, message_en: certified ? `Congratulations! Your final grade is ${finalScore}%. Your certificate is available and publicly verifiable.` : `Your final grade is ${finalScore}%. No certificate was issued for this attempt. See your account for details.`, href: certified ? `/dashboard/certificates/${certificateNumber}` : "/dashboard/exams" }, { onConflict: "user_id,event_key" });
  const emailStatus = await sendCertificationEmail({ to: candidate.email, subject: title, text: message, actionUrl, actionLabel: certified ? "Voir et telecharger mon certificat" : "Consulter ma decision" }).catch((error) => { console.error("Certification email failed", error); return "failed" as const; });
  await admin.from("audit_logs").insert({ actor_user_id: auth.user.id, action: certified ? "certificate.published" : "certificate.failed", entity_type: certified ? "certificate" : "exam_attempt", metadata: { certificate_number: certificateNumber, candidate_id: candidate.id, course_id: course.id, final_score: finalScore, email_status: emailStatus, notification_error: notification.error?.message } });
  return Response.json({ certified, certificateNumber, verificationPath, emailStatus, notificationStored: !notification.error }, { status: certified ? 201 : 200 });
}