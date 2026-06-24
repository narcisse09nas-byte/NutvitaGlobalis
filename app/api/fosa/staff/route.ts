import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const roles = ["organization_admin", "creator", "verifier", "validator"];

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { data: actor } = await session.from("fosa_members").select("*, fosa_organizations(*)").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!actor || actor.role !== "organization_admin" || actor.fosa_organizations?.status !== "approved") {
    return NextResponse.json({ message: "Administrateur FOSA requis." }, { status: 403 });
  }
  const body = await request.json();
  const role = String(body.role);
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const password = String(body.temporary_password || "");
  if (!roles.includes(role)) return NextResponse.json({ message: "Role invalide." }, { status: 400 });
  if (!email || !fullName) return NextResponse.json({ message: "Le nom et l'email sont obligatoires." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ message: "Le mot de passe initial doit contenir au moins 8 caracteres." }, { status: 400 });
  const facilityIds = Array.isArray(body.facility_ids) ? body.facility_ids.map(String) : [];
  const service = createAdminClient();
  if (facilityIds.length) {
    const { data: allowedFacilities } = await service.from("fosa_facilities").select("id").eq("organization_id", actor.organization_id).in("id", facilityIds);
    if (facilityIds.length !== (allowedFacilities || []).length) return NextResponse.json({ message: "Une FOSA selectionnee n'appartient pas a votre organisation." }, { status: 400 });
  }
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, account_type: "fosa_staff", organization_id: actor.organization_id, role } });
  if (created.error || !created.data.user) return NextResponse.json({ message: created.error?.message || "Creation impossible." }, { status: 400 });
  const { data: member, error } = await service.from("fosa_members").insert({ organization_id: actor.organization_id, user_id: created.data.user.id, email, full_name: fullName, role, status: "active", must_change_password: true, invited_by: user.id }).select().single();
  if (error) {
    await service.auth.admin.deleteUser(created.data.user.id);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  if (facilityIds.length) {
    const { error: assignmentError } = await service.from("fosa_member_facilities").insert(facilityIds.map((facilityId: string) => ({ member_id: member.id, facility_id: facilityId })));
    if (assignmentError) {
      await service.auth.admin.deleteUser(created.data.user.id);
      return NextResponse.json({ message: assignmentError.message }, { status: 400 });
    }
  }
  const callback = `${new URL(request.url).origin}/auth/callback?next=${encodeURIComponent("/mot-de-passe-oublie")}`;
  const { error: resetError } = await service.auth.resetPasswordForEmail(email, { redirectTo: callback });
  if (resetError) {
    await service.auth.admin.deleteUser(created.data.user.id);
    return NextResponse.json({ message: `Le compte n'a pas ete conserve car l'email d'activation n'a pas pu etre envoye: ${resetError.message}` }, { status: 400 });
  }
  return NextResponse.json({ ok: true, member });
}
