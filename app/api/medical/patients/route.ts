import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Creates (or reuses) a walk-in patient for the current specialist — mirrors the spirit of
// app/api/partner/clients/route.ts (create-a-walk-in-client) but intentionally simpler: medical
// has no subscription/period-access package (client.ts's getClientEntitlements() already grants
// medical_consultation access to any client with a non-cancelled medical_consultations row), so
// this only needs to find-or-create the client_profiles account and create one consultation shell
// linking specialist and patient — no platform_service_access grant, no payment record needed.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const clean = (value: string) => String(value || "").trim().toLowerCase().normalize("NFD").replace(DIACRITICS, "").replace(/[^a-z0-9.]+/g, ".").replace(/^\.+|\.+$/g, "");

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { data: specialist } = await session.from("medical_specialists").select("id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!specialist) return NextResponse.json({ message: "Medecin specialiste actif requis." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!fullName) return NextResponse.json({ message: "Le nom complet est obligatoire." }, { status: 400 });

  const admin = createAdminClient();
  let clientId: string;

  if (email) {
    const { data: existingProfile } = await admin.from("client_profiles").select("id").eq("email", email).maybeSingle();
    if (existingProfile) clientId = existingProfile.id;
    else {
      const username = clean(body.username || fullName) || `patient.${crypto.randomUUID().slice(0, 6)}`;
      const password = `Nvg-${crypto.randomUUID().slice(0, 8)}!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, account_type: "client", username, origin: "medical_onsite" } });
      if (created.error || !created.data.user) return NextResponse.json({ message: created.error?.message || "Creation impossible." }, { status: 400 });
      const { error } = await admin.from("client_profiles").upsert({ id: created.data.user.id, full_name: fullName, email, phone: body.phone || null, sex: body.sex || null, birth_date: body.birth_date || null, username, must_change_password: true, origin: "onsite" }, { onConflict: "id" });
      if (error) { await admin.auth.admin.deleteUser(created.data.user.id); return NextResponse.json({ message: error.message }, { status: 400 }); }
      clientId = created.data.user.id;
    }
  } else {
    return NextResponse.json({ message: "Un email est requis pour identifier ou creer le patient." }, { status: 400 });
  }

  const { data: consultation, error: consultationError } = await admin.from("medical_consultations").insert({
    specialist_id: specialist.id, client_id: clientId, status: "scheduled",
    chief_complaint: String(body.chief_complaint || "").trim() || null,
  }).select("*").single();
  if (consultationError) return NextResponse.json({ message: consultationError.message }, { status: 400 });

  const { data: profile } = await admin.from("client_profiles").select("*").eq("id", clientId).single();
  return NextResponse.json({ ok: true, client: profile, consultation });
}
