import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";
import { notifyPpmEvent } from "@/lib/ppm/notifications";

// Creates a brand-new cooperative contact or COGES member account with a provisional password
// (Wave 9 polish), mirroring app/api/ppm/staff/route.ts's account-creation pattern rather than a
// magic-link invite — reliable even where the recipient's email/link handling isn't a given.
// A site link is required for a COGES member (they belong to one school), but optional for a
// cooperative-type account: CooperativeManager can provision the login the moment the cooperative
// itself is created, before it has been assigned to any school yet.
function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i += 1) password += alphabet[Math.floor(Math.random() * alphabet.length)];
  return password;
}

export async function POST(request: Request) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const phone = String(body.phone || "").trim() || null;
  const partnerType = String(body.partner_type || "") as "coges" | "cooperative";
  const cooperativeId = String(body.cooperative_id || "") || null;
  const siteId = String(body.site_id || "") || null;
  const cogesRole = String(body.coges_role || "") || null;

  if (!email || !fullName || !["coges", "cooperative"].includes(partnerType)) {
    return NextResponse.json({ message: "Informations du partenaire invalides." }, { status: 400 });
  }
  if (partnerType === "coges" && !siteId) {
    return NextResponse.json({ message: "Le site est obligatoire pour un membre du COGES." }, { status: 400 });
  }
  if (partnerType === "cooperative" && !cooperativeId) {
    return NextResponse.json({ message: "La cooperative est obligatoire pour ce type de partenaire." }, { status: 400 });
  }

  // Authorize via the caller's own session-scoped client (RLS applies). With a site, reuse
  // ppm_ops_access() like the rest of the module. Without one (cooperative account provisioned at
  // cooperative-creation time, before any school assignment exists), fall back to the same
  // org-role check ppm_ops_cooperatives' own RLS policy uses.
  if (siteId) {
    const { data: site } = await session.from("ppm_ops_sites").select("operation_id").eq("id", siteId).maybeSingle();
    if (!site) return NextResponse.json({ message: "Site introuvable ou acces refuse." }, { status: 404 });
    const { data: hasAccess } = await session.rpc("ppm_ops_access", { p_operation_id: site.operation_id });
    if (!hasAccess) return NextResponse.json({ message: "Autorisation insuffisante sur cette operation." }, { status: 403 });
  } else {
    const { data: cooperative } = await session.from("ppm_ops_cooperatives").select("organization_id").eq("id", cooperativeId).maybeSingle();
    if (!cooperative) return NextResponse.json({ message: "Cooperative introuvable ou acces refuse." }, { status: 404 });
    const { data: hasAccess } = await session.rpc("ppm_role_matches", { p_roles: ["super_admin", "org_admin"], p_scope_type: "organization", p_scope_id: cooperative.organization_id });
    if (!hasAccess) return NextResponse.json({ message: "Autorisation insuffisante sur cette organisation." }, { status: 403 });
  }

  const service = createAdminClient();
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let target = listed.data.users.find(candidate => candidate.email?.toLowerCase() === email);
  let temporaryPassword: string | null = null;
  if (!target) {
    temporaryPassword = generateTemporaryPassword();
    const result = await service.auth.admin.createUser({
      email, password: temporaryPassword, email_confirm: true, user_metadata: { full_name: fullName, account_type: "ops_distribution_partner" },
    });
    if (result.error || !result.data.user) return NextResponse.json({ message: result.error?.message || "Creation du compte impossible." }, { status: 400 });
    target = result.data.user;
  }

  const { data: profile, error: profileError } = await service.from("ppm_ops_partner_profiles").upsert({
    id: target.id, candidate_id: target.id, partner_type: partnerType, cooperative_id: cooperativeId,
    full_name: fullName, phone, email, status: "active", invited_by: user.id, must_change_password: !!temporaryPassword,
  }, { onConflict: "candidate_id" }).select("*").single();
  if (profileError) return NextResponse.json({ message: profileError.message }, { status: 400 });

  if (siteId) {
    const { error: linkError } = await service.from("ppm_ops_partner_site_links").upsert({
      partner_profile_id: profile.id, site_id: siteId, role: partnerType === "coges" ? cogesRole : null,
    }, { onConflict: "partner_profile_id,site_id" });
    if (linkError) return NextResponse.json({ message: linkError.message }, { status: 400 });
  }

  await service.from("ppm_history").insert({ entity_type: "partner_profile", entity_id: profile.id, actor_id: user.id, action: temporaryPassword ? "Compte partenaire cree" : "Partenaire lie a un site supplementaire" });

  if (temporaryPassword) {
    await sendSystemEmail(service, "ppm_ops_partner_account_created", email, { name: fullName, email, temp_password: temporaryPassword });
  } else {
    await notifyPpmEvent(service, {
      recipient: { userId: target.id, email },
      category: "info",
      titleFr: "Acces au portail distribution", titleEn: "Access to the distribution portal",
      messageFr: `Vous avez ete ajoute(e) au portail distribution NutVitaGlobalis en tant que ${partnerType === "coges" ? "membre du COGES" : "cooperative"}.`,
      messageEn: `You have been added to the NutVitaGlobalis distribution portal as a ${partnerType === "coges" ? "COGES member" : "cooperative contact"}.`,
      link: "/partenaire-distribution",
    });
  }

  return NextResponse.json({ ok: true, invited: !!temporaryPassword, profile });
}
