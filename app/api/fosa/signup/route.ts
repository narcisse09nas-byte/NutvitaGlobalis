import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, isEmail, isRateLimited, resend } from "@/lib/api";

export async function POST(request: Request) {
  if (isRateLimited(`fosa-signup:${clientIp(request)}`, 3, 15 * 60_000)) {
    return NextResponse.json({ message: "Trop de tentatives. Reessayez dans quelques minutes." }, { status: 429 });
  }
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.full_name || "").trim();
  const organizationName = String(body.organization_name || "").trim();
  const facilityCount = Number(body.requested_facility_count);
  const staffCount = Number(body.requested_staff_count);
  if (!isEmail(email) || password.length < 8 || !fullName || !organizationName) {
    return NextResponse.json({ message: "Verifiez le nom, l'organisation, l'email et le mot de passe." }, { status: 400 });
  }
  if (!Number.isInteger(facilityCount) || facilityCount < 1 || !Number.isInteger(staffCount) || staffCount < 1) {
    return NextResponse.json({ message: "Les nombres de FOSA et de staffs doivent etre superieurs a zero." }, { status: 400 });
  }
  const origin = new URL(request.url).origin;
  const admin = createAdminClient();
  const metadata = {
    account_type: "fosa_request",
    full_name: fullName,
    organization_name: organizationName,
    phone: String(body.phone || ""),
    country: String(body.country || ""),
    country_code: String(body.country_code || ""),
    requested_facility_count: facilityCount,
    requested_staff_count: staffCount,
  };
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: metadata,
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/fosa/espace")}`,
    },
  });
  if (error || !data.user || !data.properties?.action_link) {
    const duplicate = /already|registered|exists/i.test(error?.message || "");
    return NextResponse.json({
      code: duplicate ? "EMAIL_EXISTS" : "SIGNUP_FAILED",
      message: duplicate
        ? "Cette adresse possede deja un compte NutVitaGlobalis. Utilisez son mot de passe actuel pour lui ajouter l'espace FOSA."
        : error?.message || "Creation du compte impossible.",
    }, { status: duplicate ? 409 : 400 });
  }
  try {
    const subject = "Confirmez votre compte FOSA NutVitaGlobalis";
    const actionUrl = data.properties.action_link;
    const safeName = fullName.replace(/[<>&"']/g, "");
    await resend("/emails", {
      from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
      to: [email],
      subject,
      text: `Bonjour ${fullName},\n\nVotre compte FOSA a ete cree. Confirmez votre adresse email avec ce lien :\n${actionUrl}\n\nVotre demande sera ensuite examinee par NutVitaGlobalis.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#143d31"><h1>${subject}</h1><p>Bonjour ${safeName},</p><p>Votre compte FOSA a ete cree. Confirmez votre adresse email pour transmettre votre demande.</p><p><a href="${actionUrl}" style="display:inline-block;background:#0f5132;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Confirmer mon adresse email</a></p><p>Votre demande sera ensuite examinee par NutVitaGlobalis.</p></div>`,
    });
  } catch (mailError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ message: mailError instanceof Error && mailError.message === "RESEND_NOT_CONFIGURED" ? "L'envoi d'email n'est pas encore configure. Ajoutez RESEND_API_KEY dans Vercel." : "Le compte n'a pas ete conserve car l'email de confirmation n'a pas pu etre envoye." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
