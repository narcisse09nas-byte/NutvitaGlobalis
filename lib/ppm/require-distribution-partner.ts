import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActivePlatformSession } from "@/lib/active-platform-session";
import type { OpsPartnerProfile } from "@/lib/ppm/types";

// Mirrors lib/partner.ts's requirePartner() for the new cooperative/COGES external portal.
// Local-admin-mode isn't wired up here (unlike requirePartner) — this guard only supports a real
// Supabase session, since local-seed.ts has no distribution-partner fixture yet.
export async function requireDistributionPartner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/api/access/open?service=project_management&role=distribution_partner");
  await requireActivePlatformSession(["project_management"], "distribution_partner");
  const { data: profile } = await supabase.from("ppm_ops_partner_profiles").select("*").eq("candidate_id", user.id).eq("status", "active").maybeSingle();
  if (!profile) redirect("/partenaire-distribution/connexion?acces=partenaire-requis");
  const { data: links } = await supabase.from("ppm_ops_partner_site_links").select("site_id").eq("partner_profile_id", profile.id);
  const siteIds = (links || []).map((row: { site_id: string }) => row.site_id);
  return { supabase, user, profile: profile as OpsPartnerProfile, siteIds };
}
