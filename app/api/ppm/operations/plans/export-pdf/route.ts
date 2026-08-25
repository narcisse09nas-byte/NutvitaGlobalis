import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDistributionPlanReport } from "@/lib/ppm/ops-pdf";
import type { OpsDistributionPlan, OpsDistributionPlanProduct, OpsDistributionPlanSite, OpsProduct, OpsSite } from "@/lib/ppm/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planId = String(body.plan_id || "");
  if (!planId) return NextResponse.json({ message: "Plan manquant." }, { status: 400 });

  const { data: plan } = await supabase.from("ppm_ops_distribution_plans").select("*").eq("id", planId).maybeSingle();
  if (!plan) return NextResponse.json({ message: "Plan introuvable ou acces refuse." }, { status: 404 });
  const typedPlan = plan as OpsDistributionPlan;

  const { data: operation } = await supabase.from("ppm_ops_operations").select("name").eq("id", typedPlan.operation_id).maybeSingle();
  const { data: planSites } = await supabase.from("ppm_ops_distribution_plan_sites").select("*").eq("plan_id", planId);
  const typedPlanSites = (planSites || []) as OpsDistributionPlanSite[];
  const siteIds = typedPlanSites.map(row => row.site_id);
  const { data: sites } = siteIds.length ? await supabase.from("ppm_ops_sites").select("*").in("id", siteIds) : { data: [] as OpsSite[] };
  const typedSites = (sites || []) as OpsSite[];

  const planSiteIds = typedPlanSites.map(row => row.id);
  const { data: planProducts } = planSiteIds.length ? await supabase.from("ppm_ops_distribution_plan_products").select("*").in("plan_site_id", planSiteIds) : { data: [] as OpsDistributionPlanProduct[] };
  const typedPlanProducts = (planProducts || []) as OpsDistributionPlanProduct[];
  const productIds = Array.from(new Set(typedPlanProducts.map(row => row.product_id)));
  const { data: products } = productIds.length ? await supabase.from("ppm_ops_products").select("*").in("id", productIds) : { data: [] as OpsProduct[] };
  const typedProducts = (products || []) as OpsProduct[];

  const siteName = (id: string) => typedSites.find(item => item.id === id)?.name || "—";
  const productName = (id: string) => typedProducts.find(item => item.id === id)?.name || "—";

  const pdfBytes = await renderDistributionPlanReport({
    operationName: operation?.name || "—",
    planCode: typedPlan.code,
    periodStart: typedPlan.period_start,
    periodEnd: typedPlan.period_end,
    siteLines: typedPlanSites.map(row => ({
      siteName: siteName(row.site_id),
      targetBeneficiaries: row.target_beneficiaries,
      rationDays: row.ration_days,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      distributionStart: row.distribution_start,
      distributionEnd: row.distribution_end,
      products: typedPlanProducts.filter(item => item.plan_site_id === row.id).map(item => ({ productName: productName(item.product_id), quantityNeeded: item.quantity_needed, unit: item.unit })),
    })),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="plan-${typedPlan.code}.pdf"` },
  });
}
