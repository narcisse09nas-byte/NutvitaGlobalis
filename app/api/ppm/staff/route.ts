import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";

// Refinement program, Wave 9 (item 50): staff creation can auto-provision a real access account
// with a generated default password — mirrors app/api/admin/users/route.ts's create-account shape
// (createAdminClient() service-role client -> auth.admin.createUser -> domain-table link ->
// sendSystemEmail) but against ppm_resources instead of admin_users, since PPM staff must NOT be
// inserted into admin_users (that table grants sitewide admin-panel access, which most PPM staff
// should never have).
function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i += 1) password += alphabet[Math.floor(Math.random() * alphabet.length)];
  return password;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const resourceId = String(body.resource_id || "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!resourceId || !email) return NextResponse.json({ message: "Ressource ou email manquant." }, { status: 400 });

  const { data: resource } = await supabase.from("ppm_resources").select("*").eq("id", resourceId).maybeSingle();
  if (!resource) return NextResponse.json({ message: "Ressource introuvable ou acces refuse." }, { status: 404 });
  if (resource.user_id) return NextResponse.json({ message: "Un compte existe deja pour ce membre du staff." }, { status: 400 });

  // Creating a real login is a sensitive, hard-to-reverse action — require actual write access to
  // the project (ppm_project_access), the same gate every other PPM mutation already goes through.
  const { data: hasAccess } = await supabase.rpc("ppm_project_access", { p_project_id: resource.project_id });
  if (!hasAccess) return NextResponse.json({ message: "Acces refuse pour ce projet." }, { status: 403 });

  const { data: project } = await supabase.from("ppm_projects").select("name").eq("id", resource.project_id).maybeSingle();

  const service = createAdminClient();
  const temporaryPassword = generateTemporaryPassword();
  const created = await service.auth.admin.createUser({
    email, password: temporaryPassword, email_confirm: true, user_metadata: { full_name: resource.name },
  });
  if (created.error || !created.data.user) return NextResponse.json({ message: created.error?.message || "Creation du compte impossible." }, { status: 400 });

  const result = await supabase.from("ppm_resources").update({
    user_id: created.data.user.id, account_email: email, must_change_password: true,
  }).eq("id", resourceId).select("*").single();
  if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });

  await sendSystemEmail(supabase, "ppm_staff_account_created", email, {
    name: resource.name, email, temp_password: temporaryPassword, project_name: project?.name || "",
  }, { project_id: resource.project_id });

  await supabase.from("ppm_history").insert({
    entity_type: "project", entity_id: resource.project_id, actor_id: user.id,
    action: `Compte d'acces cree — ${resource.name}`, note: email,
  });

  return NextResponse.json({ ok: true, resource: result.data });
}
