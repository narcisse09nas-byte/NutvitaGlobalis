import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerDeliveryList from "@/components/partenaire-distribution/PartnerDeliveryList";
import { getOpsSitesByIds, listOpsDeliveryNotesForSites } from "@/lib/ppm/queries";

export const metadata = { title: "Bons de livraison | Partenaire distribution" };

export default async function PartnerDeliveriesPage() {
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const [sites, deliveries] = await Promise.all([getOpsSitesByIds(supabase, siteIds), listOpsDeliveryNotesForSites(supabase, siteIds)]);

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerDeliveryList deliveries={deliveries} sites={sites} />
  </DistributionPartnerShell>;
}
