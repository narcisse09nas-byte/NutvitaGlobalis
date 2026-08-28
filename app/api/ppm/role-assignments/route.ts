import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PPM_ROLES, type PPMRole } from "@/lib/ppm/roles";

// Assigning a PPM role (Sprint 24) needs to resolve an email to an auth.users id, which the
// RLS-scoped client can never see (no public people-directory in this app — see
// lib/ppm/roles.ts). This route is the one place that borrows the service-role client for
// that lookup, mirroring the auth.admin.listUsers() + email-map idiom already used by
// app/api/recruitment/test-reviewers and app/api/maximus/users. Writing the assignment itself
// still goes through the RLS-scoped client, so public.ppm_role_assignments' own
// "PPM admins manage role assignments" policy (is_admin()) is the real gate — this route only
// adds the missing email->id step, it does not bypass RLS.
// Refinement program, Wave 9 (item 50): an org-scoped admin (role "org_admin" on their own
// organization) can grant/revoke roles within that same organization, without needing sitewide
// admin_users membership — this is the "org-scoped admin delegation" the plan called for. Requests
// for a different scope (or a caller with neither credential) still require sitewide admin.
async function requirePlatformAdmin(scopeType?: string, scopeId?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Non authentifie." }, { status: 401 }) } as const;
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).eq("active", true).maybeSingle();
  if (admin) return { supabase, userId: user.id } as const;
  if (scopeType === "organization" && scopeId) {
    const { data: orgAdmin } = await supabase.from("ppm_role_assignments").select("id").eq("user_id", user.id).eq("role", "org_admin").eq("scope_type", "organization").eq("scope_id", scopeId).maybeSingle();
    if (orgAdmin) return { supabase, userId: user.id } as const;
  }
  return { error: NextResponse.json({ message: "Acces reserve aux administrateurs." }, { status: 403 }) } as const;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const directory = url.searchParams.get("directory") === "1";
  const scopeType = url.searchParams.get("scope_type") || undefined;
  const scopeId = url.searchParams.get("scope_id") || undefined;
  const gate = await requirePlatformAdmin(directory ? scopeType : undefined, directory ? scopeId : undefined);
  if ("error" in gate) return gate.error;
  const ids = (url.searchParams.get("ids") || "").split(",").map(item => item.trim()).filter(Boolean);
  const service = createAdminClient();
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (directory) {
    const users = (data?.users || []).filter(item => item.email).map(item => ({ id: item.id, email: item.email as string, name: String(item.user_metadata?.full_name || item.user_metadata?.name || "").trim() })).sort((a, b) => a.email.localeCompare(b.email));
    return NextResponse.json({ users });
  }
  if (!ids.length) return NextResponse.json({ emails: {} });
  const emails: Record<string, string> = {};
  for (const authUser of data?.users || []) {
    if (authUser.email && ids.includes(authUser.id)) emails[authUser.id] = authUser.email;
  }
  return NextResponse.json({ emails });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "revoke") {
    // Revocation stays sitewide-admin-only for now — resolving the target assignment's
    // organization first to extend org-admin delegation here would add a second lookup for a
    // narrower benefit; grant (below) is the concrete case item 50 asked for.
    const gate = await requirePlatformAdmin();
    if ("error" in gate) return gate.error;
    const { supabase } = gate;
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ message: "Identifiant manquant." }, { status: 400 });
    const { error } = await supabase.from("ppm_role_assignments").delete().eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "") as PPMRole;
  const scopeType = String(body.scope_type || "");
  const scopeId = body.scope_id ? String(body.scope_id) : null;
  const customRoleLabel = role === "other" ? String(body.custom_role_label || "").trim() || null : null;
  if (!email || !PPM_ROLES.includes(role) || !["organization", "portfolio", "program", "project"].includes(scopeType) || (role === "other" && !customRoleLabel)) {
    return NextResponse.json({ message: "Email, role ou perimetre invalide." }, { status: 400 });
  }

  const gate = await requirePlatformAdmin(scopeType, scopeId);
  if ("error" in gate) return gate.error;
  const { supabase, userId } = gate;

  const service = createAdminClient();
  const { data: listed } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = listed?.users.find(item => item.email?.toLowerCase() === email);
  if (!target) return NextResponse.json({ message: "Aucun compte NutVitaGlobalis n'existe avec cet email." }, { status: 404 });

  const { data, error } = await supabase
    .from("ppm_role_assignments")
    .upsert({ user_id: target.id, role, scope_type: scopeType, scope_id: scopeId, granted_by: userId, custom_role_label: customRoleLabel }, { onConflict: "user_id,role,scope_type,scope_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, assignment: data, email: target.email });
}
