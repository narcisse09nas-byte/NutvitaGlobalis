import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, isRateLimited, resend } from "@/lib/api";
import { resolveApplicantAccount } from "@/lib/public-application-auth";

export async function POST(request: Request) {
  if (isRateLimited(`medical-application:${clientIp(request)}`, 3, 300000)) return NextResponse.json({ message: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  const form = await request.formData();
  const value = (k: string) => String(form.get(k) || "").trim();
  const email = value("email").toLowerCase();
  const fullName = value("full_name");
  const city = value("city") === "__other" ? value("other_city") : value("city");
  const specialty = value("specialty") === "other" ? value("other_specialty") : value("specialty");
  if (!specialty || !value("medical_license_number") || !value("country") || !value("state_region") || !city) {
    return NextResponse.json({ message: "Veuillez vérifier les champs obligatoires." }, { status: 400 });
  }
  const files = form.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 5 || files.some(f => f.size > 5_000_000 || !["application/pdf", "image/jpeg", "image/png"].includes(f.type))) {
    return NextResponse.json({ message: "Formats autorisés : PDF, JPG, PNG ; 5 Mo maximum par fichier." }, { status: 400 });
  }

  const resolved = await resolveApplicantAccount(
    { full_name: fullName, email, password: value("password") || undefined, password_confirmation: value("password_confirmation") || undefined },
    "medical_specialist_candidate",
    { sex: value("sex"), phone: value("phone"), specialty, country: value("country"), state_region: value("state_region"), city },
  );
  if (!resolved.ok) return NextResponse.json({ message: resolved.message }, { status: resolved.status });
  const { userId, alreadySignedIn } = resolved;
  const admin = createAdminClient();

  const { data: previous } = await admin.from("medical_specialist_applications").select("id").eq("candidate_id", userId).limit(1);
  if (previous?.length) return NextResponse.json({ message: "Une candidature existe déjà pour ce compte. Connectez-vous pour la consulter." }, { status: 409 });

  await admin.auth.admin.updateUserById(userId, { user_metadata: { full_name: fullName, account_type: "medical_specialist_candidate", sex: value("sex"), phone: value("phone"), specialty, country: value("country"), state_region: value("state_region"), city, availability: value("availability") } });

  const documents: any[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"), path = `medical-specialists/${userId}/${crypto.randomUUID()}-${safe}`;
    const upload = await admin.storage.from("document-vault").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (upload.error) return NextResponse.json({ message: "Un document n’a pas pu être enregistré." }, { status: 500 });
    documents.push({ name: file.name, path, type: file.type, size: file.size });
  }

  const payload = { candidate_id: userId, full_name: fullName, email, phone: value("phone"), sex: value("sex"), specialty, practice_mode: value("practice_mode") || "hybrid", country: value("country"), state_region: value("state_region"), city, medical_license_number: value("medical_license_number"), years_experience: Number(value("years_experience") || 0), availability: value("availability"), motivation: value("motivation"), documents };
  const inserted = await admin.from("medical_specialist_applications").insert(payload).select("application_code").single();
  if (inserted.error) return NextResponse.json({ message: inserted.error.code === "23505" ? "Une candidature existe déjà pour ce compte." : inserted.error.message }, { status: 400 });

  await admin.from("medical_specialist_notifications").insert({ user_id: userId, title_fr: "Candidature reçue", title_en: "Application received", message_fr: `Votre candidature ${inserted.data.application_code} a été reçue.`, message_en: `Your application ${inserted.data.application_code} has been received.`, link: "/medecin-candidat" });
  if (process.env.RESEND_API_KEY) await resend("/emails", { from: process.env.MAIL_FROM || "NutVitaGlobalis <contact@nutvitaglobalis.com>", to: [email], subject: "NutVitaGlobalis — Candidature reçue", text: `Bonjour ${fullName},\n\nVotre candidature ${inserted.data.application_code} a été reçue. Connectez-vous pour suivre son évolution.` }).catch(() => null);

  return NextResponse.json({ ok: true, signedIn: alreadySignedIn || true, message: "Candidature envoyée. Votre espace de suivi est prêt." });
}
