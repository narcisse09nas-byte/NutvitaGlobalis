import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, isRateLimited, resend } from "@/lib/api";
import { resolveApplicantAccount } from "@/lib/public-application-auth";

export async function POST(request: Request) {
  if (isRateLimited(`staff-application:${clientIp(request)}`, 3, 300000)) return NextResponse.json({ message: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  const form = await request.formData();
  const value = (k: string) => String(form.get(k) || "").trim();
  const email = value("email").toLowerCase();
  const fullName = value("full_name");
  const offerId = value("offer_id");
  const city = value("city") === "__other" ? value("other_city") : value("city");
  if (!offerId || !fullName || !email || !value("phone") || !value("professional_title") || !value("highest_degree") || !value("cover_letter")) {
    return NextResponse.json({ message: "Veuillez renseigner tous les champs obligatoires." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: offer } = await admin.from("maximus_job_offers").select("id,status,closing_at").eq("id", offerId).eq("status", "published").maybeSingle();
  if (!offer) return NextResponse.json({ message: "Cette offre n'est plus disponible." }, { status: 404 });
  if (offer.closing_at && new Date(offer.closing_at) < new Date()) return NextResponse.json({ message: "La date limite de candidature est dépassée." }, { status: 400 });

  const cv = form.get("cv");
  const motivation = form.get("motivation");
  const files = [cv, motivation].filter((f): f is File => f instanceof File && f.size > 0);
  if (!(cv instanceof File) || cv.size === 0) return NextResponse.json({ message: "Merci de joindre votre CV." }, { status: 400 });
  if (files.some(f => f.size > 10_000_000 || !["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type))) {
    return NextResponse.json({ message: "Formats autorisés : PDF, DOCX, JPG, PNG ; 10 Mo maximum par fichier." }, { status: 400 });
  }

  const resolved = await resolveApplicantAccount(
    { full_name: fullName, email, password: value("password") || undefined, password_confirmation: value("password_confirmation") || undefined },
    "staff_candidate",
    { whatsapp_phone: value("phone"), country: value("country"), state_region: value("state_region"), city },
  );
  if (!resolved.ok) return NextResponse.json({ message: resolved.message }, { status: resolved.status });
  const { userId } = resolved;

  const { data: existing } = await admin.from("maximus_staff_applications").select("id").eq("offer_id", offerId).eq("candidate_id", userId).maybeSingle();
  if (existing) return NextResponse.json({ message: "Vous avez déjà postulé à cette offre. Connectez-vous à votre espace candidat pour la consulter." }, { status: 409 });

  await admin.from("maximus_candidate_profiles").upsert({ id: userId, email, full_name: fullName, phone: value("phone"), country: value("country"), region: value("state_region"), city });

  const documents: Record<string, { path: string; name: string }> = {};
  for (const [field, file] of [["cv", cv], ["motivation", motivation]] as const) {
    if (!(file instanceof File) || file.size === 0) continue;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${offerId}/${field}-${crypto.randomUUID()}-${safe}`;
    const upload = await admin.storage.from("maximus-recruitment").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (upload.error) return NextResponse.json({ message: "Un document n'a pas pu être enregistré." }, { status: 500 });
    documents[field] = { path, name: file.name };
  }

  const payload = {
    offer_id: offerId, candidate_id: userId, full_name: fullName, email, phone: value("phone"), address: value("address") || null,
    professional_title: value("professional_title"), highest_degree: value("highest_degree"), years_experience: Number(value("years_experience") || 0),
    cover_letter: value("cover_letter"), documents, status: "submitted", submitted_at: new Date().toISOString(),
  };
  const inserted = await admin.from("maximus_staff_applications").insert(payload).select("id").single();
  if (inserted.error) return NextResponse.json({ message: inserted.error.code === "23505" ? "Vous avez déjà postulé à cette offre." : inserted.error.message }, { status: 400 });

  await admin.from("maximus_recruitment_events").insert({ process_type: "staff", offer_id: offerId, staff_application_id: inserted.data.id, event_type: "application_submitted", to_status: "submitted", actor_id: userId, actor_email: email });
  await admin.from("maximus_candidate_notifications").insert({ candidate_id: userId, application_id: inserted.data.id, title: "Candidature reçue", message: "Votre candidature Staff a été transmise. Vous serez informé de chaque prochaine étape dans cet espace.", action_url: "/staff-candidat" });
  try {
    await resend("/emails", { from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>", to: [email], subject: "Confirmation de votre candidature Staff NutVitaGlobalis", text: `Bonjour ${fullName},\n\nVotre candidature a bien été reçue. Vous pourrez suivre son statut depuis votre espace candidat Staff.\n\nÉquipe NutVitaGlobalis` });
  } catch (error) {
    console.error("Staff application confirmation email", error);
  }

  return NextResponse.json({ ok: true, message: "Candidature envoyée. Votre espace de suivi est prêt." });
}
