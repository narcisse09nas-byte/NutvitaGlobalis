import { NextResponse } from "next/server";
import { clientIp, isEmail, isRateLimited, jsonError, resend } from "@/lib/api";

export async function POST(request: Request) {
  if (isRateLimited(`contact:${clientIp(request)}`)) return jsonError("Trop de tentatives. Reessayez dans une minute.", 429);
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const subject = String(body?.subject ?? "Demande d'information").trim();
  const message = String(body?.message ?? "").trim();

  if (body?.website) return NextResponse.json({ ok: true, message: "Votre message a bien ete envoye." });
  if (name.length < 2 || name.length > 100 || !isEmail(email) || message.length < 10 || message.length > 5000) {
    return jsonError("Veuillez verifier les informations saisies.", 400);
  }

  const mail = {
    from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
    to: [process.env.CONTACT_TO_EMAIL ?? "contact@nutvitaglobalis.com"],
    reply_to: email,
    subject: `[Site] ${subject}`,
    text: `Nom: ${name}\nEmail: ${email}\nSujet: ${subject}\n\n${message}`,
  };

  if (!process.env.RESEND_API_KEY) {
    console.info("Contact form received without Resend configured", mail);
    return NextResponse.json({ ok: true, message: "Votre message a bien ete enregistre. L'equipe NutVitaGlobalis vous repondra rapidement." });
  }

  try {
    await resend("/emails", mail);
    return NextResponse.json({ ok: true, message: "Votre message a bien ete envoye." });
  } catch (error) {
    console.error("Contact form error", error);
    return jsonError("L'envoi est momentanement indisponible. Contactez-nous par WhatsApp ou email.", 503);
  }
}
