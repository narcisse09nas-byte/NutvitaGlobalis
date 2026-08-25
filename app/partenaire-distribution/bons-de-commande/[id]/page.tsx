import { notFound } from "next/navigation";
import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import PartnerPurchaseOrderDetail from "@/components/partenaire-distribution/PartnerPurchaseOrderDetail";
import { getOpsSitesByIds } from "@/lib/ppm/queries";
import type { OpsCooperative, OpsMenu, OpsPoDailyLine, OpsPoIngredientLine, OpsProduct, OpsPurchaseOrder } from "@/lib/ppm/types";

export default async function PartnerPurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const sites = await getOpsSitesByIds(supabase, siteIds);

  const { data: po } = await supabase.from("ppm_ops_purchase_orders").select("*").eq("id", id).maybeSingle();
  if (!po || !siteIds.includes(po.site_id)) notFound();
  const typedPo = po as OpsPurchaseOrder;

  const [{ data: cooperative }, { data: dailyLines }, { data: ingredientLines }] = await Promise.all([
    supabase.from("ppm_ops_cooperatives").select("*").eq("id", typedPo.cooperative_id).maybeSingle(),
    supabase.from("ppm_ops_po_daily_lines").select("*").eq("po_id", id).order("ration_date"),
    supabase.from("ppm_ops_po_ingredient_lines").select("*").eq("po_id", id),
  ]);
  const typedCooperative = cooperative as OpsCooperative | null;
  const typedDailyLines = (dailyLines || []) as OpsPoDailyLine[];
  const typedIngredientLines = (ingredientLines || []) as OpsPoIngredientLine[];

  const menuIds = Array.from(new Set(typedDailyLines.map(row => row.menu_id)));
  const productIds = Array.from(new Set(typedIngredientLines.map(row => row.product_id)));
  const [{ data: menus }, { data: products }] = await Promise.all([
    menuIds.length ? supabase.from("ppm_ops_menus").select("*").in("id", menuIds) : Promise.resolve({ data: [] as OpsMenu[] }),
    productIds.length ? supabase.from("ppm_ops_products").select("*").in("id", productIds) : Promise.resolve({ data: [] as OpsProduct[] }),
  ]);
  const typedMenus = (menus || []) as OpsMenu[];
  const typedProducts = (products || []) as OpsProduct[];

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <PartnerPurchaseOrderDetail
      po={typedPo} siteName={sites.find(item => item.id === typedPo.site_id)?.name || "—"} cooperativeName={typedCooperative?.name || "—"}
      dailyLines={typedDailyLines} ingredientLines={typedIngredientLines}
      productName={pid => typedProducts.find(item => item.id === pid)?.name || "—"} menuName={mid => typedMenus.find(item => item.id === mid)?.name || "—"}
      partnerType={profile.partner_type}
    />
  </DistributionPartnerShell>;
}
