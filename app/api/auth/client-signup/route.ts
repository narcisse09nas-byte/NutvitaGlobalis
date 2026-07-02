import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.full_name || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || fullName.length < 2) return NextResponse.json({ message: "Nom, email ou mot de passe invalide." }, { status: 400 });
  if (body.accepted_terms !== true || body.accepted_privacy !== true) return NextResponse.json({ message: "Acceptez les conditions generales et la politique de confidentialite." }, { status: 400 });
  const acceptedAt = new Date().toISOString();
  const profile = { full_name: fullName, whatsapp_phone: String(body.whatsapp_phone || ""), country: String(body.country || ""), country_code: String(body.country_code || ""), state_region: String(body.state_region || ""), city: String(body.city || ""), other_city: String(body.other_city || ""), account_type: "client", accepted_terms_at: acceptedAt, accepted_privacy_at: acceptedAt };
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: profile });
  if (created.error || !created.data.user) {
    const duplicate = /already|registered|exists/i.test(created.error?.message || "");
    return NextResponse.json({ message: duplicate ? "Un compte existe deja avec cette adresse email." : created.error?.message || "Creation du compte impossible." }, { status: 400 });
  }
  const { error } = await admin.from("client_profiles").upsert({ id: created.data.user.id, email, ...profile });
  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  await Promise.all([
    admin.from("user_consents").upsert({ user_id: created.data.user.id, consent_type: "terms", accepted: true, signed_at: acceptedAt, signature_text: fullName, source: "signup" }, { onConflict: "user_id,consent_type" }),
    admin.from("user_consents").upsert({ user_id: created.data.user.id, consent_type: "privacy", accepted: true, signed_at: acceptedAt, signature_text: fullName, source: "signup" }, { onConflict: "user_id,consent_type" }),
  ]);
  await sendSystemEmail(admin, "account_welcome", email, { name: fullName, action_url: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/connexion` }, { user_id: created.data.user.id });
  return NextResponse.json({ message: "Compte cree. Vous pouvez maintenant vous connecter." });
}
