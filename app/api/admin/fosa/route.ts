import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { data: actor } = await session.from("admin_users").select("id,role,active").eq("id", user.id).maybeSingle();
  if (!actor?.active || !["super_admin", "health_admin"].includes(actor.role)) {
    return NextResponse.json({ message: "Acces administrateur FOSA requis." }, { status: 403 });
  }
  const body = await request.json();
  const action = String(body.action || "");
  const notes = String(body.notes || "").trim();
  if (action === "delete") {
    if (actor.role !== "super_admin") return NextResponse.json({ message: "Seul le super admin peut supprimer un espace FOSA." }, { status: 403 });
    if (notes.length < 5) return NextResponse.json({ message: "Indiquez une raison de suppression suffisamment precise." }, { status: 400 });
    const admin = createAdminClient();
    const { data: organization } = await admin.from("fosa_organizations").select("*").eq("id", String(body.id)).maybeSingle();
    if (!organization) return NextResponse.json({ message: "Espace FOSA introuvable." }, { status: 404 });
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      actor_role: actor.role,
      action: "fosa_space_deleted",
      resource_type: "fosa_organization",
      resource_id: organization.id,
      metadata: { reason: notes, organization: organization.name, owner_user_id: organization.owner_user_id, contact_email: organization.contact_email },
    });
    const { error: deleteError } = await admin.from("fosa_organizations").delete().eq("id", organization.id);
    if (deleteError) return NextResponse.json({ message: deleteError.message }, { status: 400 });
    const { data: owner } = await admin.auth.admin.getUserById(organization.owner_user_id);
    if (owner.user) {
      await admin.auth.admin.updateUserById(owner.user.id, {
        user_metadata: { ...owner.user.user_metadata, fosa_requested: false, fosa_organization_id: null },
      });
    }
    await sendSystemEmail(admin, "fosa_request_rejected", organization.contact_email, {
      name: organization.contact_name,
      organization: organization.name,
      reason: `Votre espace FOSA a ete supprime. Motif : ${notes}`,
      action_url: `${new URL(request.url).origin}/contact`,
    }, { organization_id: organization.id, deleted: true, reason: notes });
    return NextResponse.json({ ok: true, deleted: true });
  }
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : null;
  if (!status) return NextResponse.json({ message: "Action invalide." }, { status: 400 });
  const admin = createAdminClient();
  const { data: organization } = await admin.from("fosa_organizations").select("*").eq("id", String(body.id)).maybeSingle();
  if (!organization) return NextResponse.json({ message: "Demande introuvable." }, { status: 404 });
  const now = new Date().toISOString();
  const { error } = await admin.from("fosa_organizations").update({
    status,
    admin_notes: notes || null,
    approved_by: user.id,
    approved_at: status === "approved" ? now : null,
  }).eq("id", organization.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await admin.from("fosa_members").update({ status: status === "approved" ? "active" : "suspended" }).eq("organization_id", organization.id).eq("user_id", organization.owner_user_id);
  await admin.from("audit_logs").insert({ actor_id: user.id, actor_role: actor.role, action: `fosa_request_${status}`, resource_type: "fosa_organization", resource_id: organization.id, metadata: { notes: notes || null } });
  await sendSystemEmail(admin, status === "approved" ? "fosa_request_approved" : "fosa_request_rejected", organization.contact_email, {
    name: organization.contact_name,
    organization: organization.name,
    reason: notes || "Non precise",
    action_url: `${new URL(request.url).origin}/fosa/connexion`,
  }, { organization_id: organization.id });
  return NextResponse.json({ ok: true, status });
}
