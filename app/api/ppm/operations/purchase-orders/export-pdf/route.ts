import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderPurchaseOrderReport } from "@/lib/ppm/ops-pdf";
import type { OpsCooperative, OpsMenu, OpsPoDailyLine, OpsPoIngredientLine, OpsProduct, OpsPurchaseOrder, OpsSite } from "@/lib/ppm/types";

const statusLabelsFr: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumis", coges_approved: "Approuve (COGES)", endorsed_by_cooperative: "Endosse (cooperative)",
  returned: "Retourne", rejected: "Rejete", cancelled: "Annule",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const poId = String(body.po_id || "");
  if (!poId) return NextResponse.json({ message: "Bon de commande manquant." }, { status: 400 });

  const { data: po } = await supabase.from("ppm_ops_purchase_orders").select("*").eq("id", poId).maybeSingle();
  if (!po) return NextResponse.json({ message: "Bon de commande introuvable ou acces refuse." }, { status: 404 });
  const typedPo = po as OpsPurchaseOrder;

  const [{ data: site }, { data: cooperative }, { data: dailyLines }, { data: ingredientLines }] = await Promise.all([
    supabase.from("ppm_ops_sites").select("*").eq("id", typedPo.site_id).maybeSingle(),
    supabase.from("ppm_ops_cooperatives").select("*").eq("id", typedPo.cooperative_id).maybeSingle(),
    supabase.from("ppm_ops_po_daily_lines").select("*").eq("po_id", poId).order("ration_date"),
    supabase.from("ppm_ops_po_ingredient_lines").select("*").eq("po_id", poId),
  ]);
  const typedSite = site as OpsSite | null;
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
  const menuName = (id: string) => typedMenus.find(item => item.id === id)?.name || "—";
  const productName = (id: string) => typedProducts.find(item => item.id === id)?.name || "—";

  const pdfBytes = await renderPurchaseOrderReport({
    poNumber: typedPo.id,
    siteName: typedSite?.name || "—",
    cooperativeName: typedCooperative?.name || "—",
    cooperativeAddress: typedPo.cooperative_address_snapshot || undefined,
    cooperativePhone: typedPo.cooperative_phone_snapshot || undefined,
    cooperativeEmail: typedPo.cooperative_email_snapshot || undefined,
    periodStart: typedPo.period_start,
    periodEnd: typedPo.period_end,
    status: statusLabelsFr[typedPo.status] || typedPo.status,
    days: typedDailyLines.map(row => ({ date: row.ration_date, menuName: menuName(row.menu_id), studentCount: row.student_count })),
    ingredients: typedIngredientLines.map(row => ({ productName: productName(row.product_id), quantityMt: row.quantity_mt, unitPrice: row.unit_price, totalPrice: row.total_price })),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="bon-commande-${typedPo.id.replace(/\//g, "-")}.pdf"` },
  });
}
