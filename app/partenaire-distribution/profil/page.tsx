import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerProfileForm from "@/components/partenaire-distribution/PartnerProfileForm";
import { getOpsSitesByIds } from "@/lib/ppm/queries";
import type { OpsCooperative, OpsSitePaymentAccount } from "@/lib/ppm/types";

export const metadata = { title: "Mon profil | Partenaire distribution" };

export default async function PartnerProfilePage() {
  const { supabase, user, profile, siteIds } = await requireDistributionPartner();
  const sites = await getOpsSitesByIds(supabase, siteIds);

  const { data: cooperative } = profile.cooperative_id ? await supabase.from("ppm_ops_cooperatives").select("*").eq("id", profile.cooperative_id).maybeSingle() : { data: null };
  const { data: siteAccounts } = profile.partner_type === "coges" && sites[0] ? await supabase.from("ppm_ops_site_payment_accounts").select("*").eq("site_id", sites[0].id) : { data: [] as OpsSitePaymentAccount[] };

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerProfileForm profile={profile} email={user.email || ""} cooperative={cooperative as OpsCooperative | null} siteAccounts={(siteAccounts || []) as OpsSitePaymentAccount[]} />
  </DistributionPartnerShell>;
}
