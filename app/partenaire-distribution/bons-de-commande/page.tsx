import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerPurchaseOrderList from "@/components/partenaire-distribution/PartnerPurchaseOrderList";
import { getOpsSitesByIds, listOpsPurchaseOrdersForSites } from "@/lib/ppm/queries";

export const metadata = { title: "Bons de commande | Partenaire distribution" };

export default async function PartnerPurchaseOrdersPage() {
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const [sites, purchaseOrders] = await Promise.all([getOpsSitesByIds(supabase, siteIds), listOpsPurchaseOrdersForSites(supabase, siteIds)]);

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerPurchaseOrderList purchaseOrders={purchaseOrders} sites={sites} />
  </DistributionPartnerShell>;
}
