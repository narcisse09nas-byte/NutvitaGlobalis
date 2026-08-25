import { notFound } from "next/navigation";
import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerInvoiceDetail from "@/components/partenaire-distribution/PartnerInvoiceDetail";
import { getOpsSitesByIds } from "@/lib/ppm/queries";
import type { OpsCooperative, OpsInvoice } from "@/lib/ppm/types";

export default async function PartnerInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const sites = await getOpsSitesByIds(supabase, siteIds);

  const { data: invoice } = await supabase.from("ppm_ops_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice || !siteIds.includes(invoice.site_id)) notFound();
  const typedInvoice = invoice as OpsInvoice;

  const { data: cooperative } = typedInvoice.cooperative_id ? await supabase.from("ppm_ops_cooperatives").select("*").eq("id", typedInvoice.cooperative_id).maybeSingle() : { data: null };
  const typedCooperative = cooperative as OpsCooperative | null;

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerInvoiceDetail invoice={typedInvoice} siteName={sites.find(item => item.id === typedInvoice.site_id)?.name || "—"} cooperativeName={typedCooperative?.name} partnerType={profile.partner_type} />
  </DistributionPartnerShell>;
}
