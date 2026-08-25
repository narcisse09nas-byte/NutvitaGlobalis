import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerInvoiceList from "@/components/partenaire-distribution/PartnerInvoiceList";
import { getOpsSitesByIds, listOpsInvoicesForSites } from "@/lib/ppm/queries";

export const metadata = { title: "Factures | Partenaire distribution" };

export default async function PartnerInvoicesPage() {
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const [sites, invoices] = await Promise.all([getOpsSitesByIds(supabase, siteIds), listOpsInvoicesForSites(supabase, siteIds)]);

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerInvoiceList invoices={invoices} sites={sites} />
  </DistributionPartnerShell>;
}
