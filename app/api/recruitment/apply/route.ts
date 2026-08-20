import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, isRateLimited, resend } from "@/lib/api";
import { resolveApplicantAccount } from "@/lib/public-application-auth";
import { documentFields } from "@/lib/recruitment-data";

export async function POST(request: Request) {
  if (isRateLimited(`recruitment-application:${clientIp(request)}`, 3, 300000)) return NextResponse.json({ message: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  const form = await request.formData();
  const value = (k: string) => String(form.get(k) || "").trim();
  const email = value("email").toLowerCase();
  const fullName = value("full_name");
  const isPromoter = value("recruitment_type") === "promoter";
  const city = value("city") === "__other" ? value("other_city") : value("city");
  const jobOfferId = value("job_offer_id") || null;

  const requiredCommon = [fullName, value("birth_date"), value("country"), city, value("whatsapp_phone"), email];
  if (requiredCommon.some(v => !v)) return NextResponse.json({ message: "Veuillez renseigner tous les champs obligatoires." }, { status: 400 });
  if (isPromoter) {
    if (!value("professional_references")) return NextResponse.json({ message: "Merci de décrire votre motivation." }, { status: 400 });
    if (!value("declaration_accuracy") || !value("declaration_privacy")) return NextResponse.json({ message: "Merci d'accepter les déclarations requises." }, { status: 400 });
  } else {
    if (!value("professional_title") || !value("highest_degree") || !value("specialization")) return NextResponse.json({ message: "Veuillez compléter votre profil professionnel." }, { status: 400 });
    if (!value("declaration_accuracy") || !value("declaration_references") || !value("declaration_privacy") || !value("declaration_standards")) return NextResponse.json({ message: "Merci d'accepter toutes les déclarations requises." }, { status: 400 });
  }

  const requiredDocs = isPromoter ? documentFields.filter(([key]) => key === "identity") : documentFields;
  const filesByField = new Map<string, File[]>();
  for (const [key] of documentFields) {
    const files = form.getAll(`document_${key}`).filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length) filesByField.set(key, files);
  }
  const missingDocs = requiredDocs.filter(([key]) => !filesByField.get(key)?.length).map(([, label]) => label);
  if (missingDocs.length) return NextResponse.json({ message: `Documents manquants : ${missingDocs.join(", ")}.` }, { status: 400 });
  const allFiles = [...filesByField.values()].flat();
  if (allFiles.some(f => f.size > 8_000_000 || !["application/pdf", "image/jpeg", "image/png"].includes(f.type))) {
    return NextResponse.json({ message: "Formats autorisés : PDF, JPG, PNG ; 8 Mo maximum par fichier." }, { status: 400 });
  }

  const resolved = await resolveApplicantAccount(
    { full_name: fullName, email, password: value("password") || undefined, password_confirmation: value("password_confirmation") || undefined },
    "candidate",
    { country: value("country"), city, whatsapp_phone: value("whatsapp_phone") },
  );
  if (!resolved.ok) return NextResponse.json({ message: resolved.message }, { status: resolved.status });
  const { userId } = resolved;
  const admin = createAdminClient();

  const { data: existingApp } = await admin.from("recruitment_applications").select("id,status").eq("candidate_id", userId).maybeSingle();
  if (existingApp && !["started", "incomplete"].includes(existingApp.status)) {
    return NextResponse.json({ message: "Une candidature existe déjà pour ce compte. Connectez-vous à votre espace candidat pour la consulter." }, { status: 409 });
  }

  const documents: Record<string, Array<{ name: string; path: string }>> = {};
  for (const [field, files] of filesByField) {
    documents[field] = [];
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${userId}/${field}/${crypto.randomUUID()}-${safe}`;
      const upload = await admin.storage.from("recruitment-documents").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
      if (upload.error) return NextResponse.json({ message: "Un document n’a pas pu être enregistré." }, { status: 500 });
      documents[field].push({ name: file.name, path });
    }
  }

  const payload: Record<string, unknown> = {
    candidate_id: userId,
    full_name: fullName,
    birth_date: value("birth_date"),
    country: value("country"),
    city,
    whatsapp_phone: value("whatsapp_phone"),
    email,
    address: value("address") || null,
    documents,
    declaration_accuracy: value("declaration_accuracy") === "on",
    declaration_privacy: value("declaration_privacy") === "on",
    declaration_references: value("declaration_references") === "on",
    declaration_standards: value("declaration_standards") === "on",
    recruitment_type: isPromoter ? "promoter" : "dietitian_partner",
    job_offer_id: jobOfferId,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };
  if (isPromoter) {
    payload.professional_references = value("professional_references");
  } else {
    payload.professional_title = value("professional_title");
    payload.highest_degree = value("highest_degree");
    payload.specialization = value("specialization");
    payload.years_experience = Number(value("years_experience") || 0);
    payload.languages = form.getAll("languages").map(String).filter(Boolean);
    payload.weekly_availability = value("weekly_availability") || null;
    payload.desired_rate = value("desired_rate") ? Number(value("desired_rate")) : null;
    payload.intervention_domains = form.getAll("intervention_domains").map(String).filter(Boolean);
    payload.professional_references = value("professional_references") || null;
  }

  const upserted = existingApp
    ? await admin.from("recruitment_applications").update(payload).eq("id", existingApp.id).select("id").single()
    : await admin.from("recruitment_applications").insert(payload).select("id").single();
  if (upserted.error) return NextResponse.json({ message: upserted.error.message }, { status: 400 });

  await admin.from("recruitment_history").insert({ application_id: upserted.data.id, actor_id: userId, action: "Dossier soumis", from_status: existingApp?.status || "started", to_status: "submitted" });
  await admin.from("recruitment_notifications").insert({ candidate_id: userId, title: "Candidature reçue", message: "Votre dossier a été soumis. Notre équipe va procéder à son analyse administrative." });
  try {
    await resend("/emails", { from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>", to: [email], subject: "Confirmation de votre candidature NutVitaGlobalis", text: `Bonjour ${fullName},\n\nVotre dossier de candidature a bien été soumis. Notre équipe vous informera des prochaines étapes depuis votre espace candidat.\n\nÉquipe NutVitaGlobalis` });
  } catch (error) {
    console.error("Recruitment application confirmation email", error);
  }

  return NextResponse.json({ ok: true, message: "Candidature envoyée. Votre espace de suivi est prêt." });
}
