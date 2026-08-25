import { notFound } from "next/navigation";
import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerDeliveryDetail from "@/components/partenaire-distribution/PartnerDeliveryDetail";
import { getOpsSitesByIds } from "@/lib/ppm/queries";
import type { OpsDeliveryLine, OpsDeliveryNote, OpsProduct } from "@/lib/ppm/types";

export default async function PartnerDeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const sites = await getOpsSitesByIds(supabase, siteIds);

  const { data: delivery } = await supabase.from("ppm_ops_delivery_notes").select("*").eq("id_pk", id).maybeSingle();
  if (!delivery || !siteIds.includes(delivery.site_id)) notFound();
  const typedDelivery = delivery as OpsDeliveryNote;

  const { data: lines } = await supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", id);
  const typedLines = (lines || []) as OpsDeliveryLine[];
  const productIds = Array.from(new Set(typedLines.map(row => row.product_id)));
  const { data: products } = productIds.length ? await supabase.from("ppm_ops_products").select("*").in("id", productIds) : { data: [] as OpsProduct[] };
  const typedProducts = (products || []) as OpsProduct[];

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerDeliveryDetail
      delivery={typedDelivery} siteName={sites.find(item => item.id === typedDelivery.site_id)?.name || "—"}
      lines={typedLines} productName={pid => typedProducts.find(item => item.id === pid)?.name || "—"} partnerType={profile.partner_type}
    />
  </DistributionPartnerShell>;
}
