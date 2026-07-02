import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || fullName.length < 2) return NextResponse.json({ message: "Nom, email ou mot de passe invalide." }, { status: 400 });
    if (body.accepted_terms !== true || body.accepted_privacy !== true) return NextResponse.json({ message: "Acceptez les conditions generales et la politique de confidentialite." }, { status: 400 });
    const acceptedAt = new Date().toISOString();
    const profile = { full_name: fullName, whatsapp_phone: String(body.whatsapp_phone || ""), country: String(body.country || ""), country_code: String(body.country_code || ""), state_region: String(body.state_region || ""), city: String(body.city || ""), other_city: String(body.other_city || ""), account_type: "client", accepted_terms_at: acceptedAt, accepted_privacy_at: acceptedAt };
    const admin = createAdminClient();

    // Admin creation never invokes Supabase confirmation email delivery.
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: profile,
    });
    if (created.error || !created.data.user) {
      const rawMessage = created.error?.message || "";
      const duplicate = /already|registered|exists/i.test(rawMessage);
      const mailFailure = /confirmation email|sending email|smtp|email_address_not_authorized/i.test(rawMessage);
      return NextResponse.json({
        message: duplicate
          ? "Un compte existe deja avec cette adresse email. Connectez-vous ou reinitialisez le mot de passe."
          : mailFailure
            ? "La configuration email Supabase est incorrecte. L inscription securisee sans confirmation SMTP n a pas pu aboutir."
            : rawMessage || "Creation du compte impossible.",
        code: duplicate ? "ACCOUNT_EXISTS" : mailFailure ? "AUTH_EMAIL_CONFIGURATION" : "AUTH_CREATE_FAILED",
      }, { status: 400 });
    }
    const { error } = await admin.from("client_profiles").upsert({ id: created.data.user.id, email, ...profile });
    if (error) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      return NextResponse.json({ message: `Le compte n a pas ete finalise: ${error.message}`, code: "PROFILE_CREATE_FAILED" }, { status: 400 });
    }
    await Promise.all([
      admin.from("user_consents").upsert({ user_id: created.data.user.id, consent_type: "terms", accepted: true, signed_at: acceptedAt, signature_text: fullName, source: "signup" }, { onConflict: "user_id,consent_type" }),
      admin.from("user_consents").upsert({ user_id: created.data.user.id, consent_type: "privacy", accepted: true, signed_at: acceptedAt, signature_text: fullName, source: "signup" }, { onConflict: "user_id,consent_type" }),
    ]);
    await sendSystemEmail(admin, "account_welcome", email, { name: fullName, action_url: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/connexion` }, { user_id: created.data.user.id });
    return NextResponse.json({
      message: "Compte cree et active. Vous pouvez maintenant vous connecter.",
      login_url: `/connexion?identifiant=${encodeURIComponent(email)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const configurationError = /SUPABASE_SERVICE_ROLE_KEY|Supabase/i.test(message);
    console.error("Client signup failed", error);
    return NextResponse.json({
      message: configurationError
        ? "La creation de compte est momentanement indisponible: configuration Supabase serveur incomplete."
        : "La creation du compte a echoue. Reessayez dans quelques instants.",
      code: configurationError ? "SERVER_CONFIGURATION" : "SIGNUP_FAILED",
    }, { status: 503 });
  }
}
