import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderNeedReport } from "@/lib/ppm/ops-pdf";
import type { OpsNeed, OpsNeedProduct, OpsNeedSite, OpsProduct, OpsSite } from "@/lib/ppm/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const needId = String(body.need_id || "");
  if (!needId) return NextResponse.json({ message: "Besoin manquant." }, { status: 400 });

  const { data: need } = await supabase.from("ppm_ops_needs").select("*").eq("id", needId).maybeSingle();
  if (!need) return NextResponse.json({ message: "Besoin introuvable ou acces refuse." }, { status: 404 });
  const typedNeed = need as OpsNeed;

  const { data: needSites } = await supabase.from("ppm_ops_need_sites").select("*").eq("need_id", needId);
  const typedNeedSites = (needSites || []) as OpsNeedSite[];
  const siteIds = typedNeedSites.map(row => row.site_id);
  const { data: sites } = siteIds.length ? await supabase.from("ppm_ops_sites").select("*").in("id", siteIds) : { data: [] as OpsSite[] };
  const typedSites = (sites || []) as OpsSite[];

  const needSiteIds = typedNeedSites.map(row => row.id);
  const { data: needProducts } = needSiteIds.length ? await supabase.from("ppm_ops_need_products").select("*").in("need_site_id", needSiteIds) : { data: [] as OpsNeedProduct[] };
  const typedNeedProducts = (needProducts || []) as OpsNeedProduct[];
  const productIds = Array.from(new Set(typedNeedProducts.map(row => row.product_id)));
  const { data: products } = productIds.length ? await supabase.from("ppm_ops_products").select("*").in("id", productIds) : { data: [] as OpsProduct[] };
  const typedProducts = (products || []) as OpsProduct[];

  const siteName = (id: string) => typedSites.find(item => item.id === id)?.name || "—";
  const productName = (id: string) => typedProducts.find(item => item.id === id)?.name || "—";

  const pdfBytes = await renderNeedReport({
    needCode: typedNeed.code,
    periodStart: typedNeed.period_start,
    periodEnd: typedNeed.period_end,
    siteLines: typedNeedSites.map(row => ({
      siteName: siteName(row.site_id),
      targetBeneficiaries: row.target_beneficiaries,
      rationDays: row.ration_days,
      desiredStartDate: row.desired_start_date,
      products: typedNeedProducts.filter(item => item.need_site_id === row.id).map(item => ({
        productName: productName(item.product_id), onSiteStock: item.on_site_stock, quantityRequired: item.quantity_required, quantityNeeded: item.quantity_needed,
      })),
    })),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="besoin-${typedNeed.code}.pdf"` },
  });
}
