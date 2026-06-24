import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user?.email) return NextResponse.json({ message: "Reconnectez-vous avec votre compte NutVitaGlobalis." }, { status: 401 });

  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const organizationName = String(body.organization_name || "").trim();
  const facilityCount = Number(body.requested_facility_count);
  const staffCount = Number(body.requested_staff_count);
  if (email !== user.email.toLowerCase()) return NextResponse.json({ message: "L'adresse connectee ne correspond pas a la demande." }, { status: 403 });
  if (!fullName || !organizationName || !Number.isInteger(facilityCount) || facilityCount < 1 || !Number.isInteger(staffCount) || staffCount < 1) {
    return NextResponse.json({ message: "Completez correctement les informations de la demande FOSA." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("fosa_organizations").select("id,status").eq("owner_user_id", user.id).maybeSingle();
  if (existing) {
    return NextResponse.json({
      code: "REQUEST_EXISTS",
      message: existing.status === "approved" ? "Votre espace FOSA est deja actif." : "Une demande FOSA existe deja pour ce compte.",
    }, { status: 409 });
  }

  const { data: organization, error } = await admin.from("fosa_organizations").insert({
    name: organizationName,
    owner_user_id: user.id,
    contact_name: fullName,
    contact_email: user.email,
    contact_phone: String(body.phone || "") || null,
    country: String(body.country || "") || null,
    requested_facility_count: facilityCount,
    requested_staff_count: staffCount,
    status: "pending",
  }).select().single();
  if (error || !organization) return NextResponse.json({ message: error?.message || "Demande FOSA impossible." }, { status: 400 });

  const { error: memberError } = await admin.from("fosa_members").insert({
    organization_id: organization.id,
    user_id: user.id,
    email: user.email,
    full_name: fullName,
    role: "organization_admin",
    status: "pending",
  });
  if (memberError) {
    await admin.from("fosa_organizations").delete().eq("id", organization.id);
    return NextResponse.json({ message: memberError.message }, { status: 400 });
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      full_name: user.user_metadata?.full_name || fullName,
      fosa_requested: true,
      fosa_organization_id: organization.id,
    },
  });
  return NextResponse.json({ ok: true, existingAccount: true });
}
