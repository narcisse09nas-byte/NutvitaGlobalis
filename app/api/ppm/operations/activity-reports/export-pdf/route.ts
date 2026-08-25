import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderActivityReportReport } from "@/lib/ppm/ops-pdf";
import type { OpsActivityBeneficiary, OpsActivityReport, OpsActivityReportProduct, OpsAgeGroup, OpsProduct, OpsSite } from "@/lib/ppm/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reportId = String(body.report_id || "");
  if (!reportId) return NextResponse.json({ message: "Rapport manquant." }, { status: 400 });

  const { data: report } = await supabase.from("ppm_ops_activity_reports").select("*").eq("id_pk", reportId).maybeSingle();
  if (!report) return NextResponse.json({ message: "Rapport introuvable ou acces refuse." }, { status: 404 });
  const typedReport = report as OpsActivityReport;

  const [{ data: site }, { data: products }, { data: beneficiaries }] = await Promise.all([
    supabase.from("ppm_ops_sites").select("*").eq("id", typedReport.site_id).maybeSingle(),
    supabase.from("ppm_ops_activity_report_products").select("*").eq("report_id", reportId),
    supabase.from("ppm_ops_activity_beneficiaries").select("*").eq("report_id", reportId),
  ]);
  const typedSite = site as OpsSite | null;
  const typedProducts = (products || []) as OpsActivityReportProduct[];
  const typedBeneficiaries = (beneficiaries || []) as OpsActivityBeneficiary[];

  const productIds = Array.from(new Set(typedProducts.map(row => row.product_id)));
  const ageGroupIds = Array.from(new Set(typedBeneficiaries.map(row => row.age_group_id)));
  const [{ data: productCatalog }, { data: ageGroups }] = await Promise.all([
    productIds.length ? supabase.from("ppm_ops_products").select("*").in("id", productIds) : Promise.resolve({ data: [] as OpsProduct[] }),
    ageGroupIds.length ? supabase.from("ppm_ops_age_groups").select("*").in("id", ageGroupIds) : Promise.resolve({ data: [] as OpsAgeGroup[] }),
  ]);
  const typedProductCatalog = (productCatalog || []) as OpsProduct[];
  const typedAgeGroups = (ageGroups || []) as OpsAgeGroup[];
  const productName = (id: string) => typedProductCatalog.find(item => item.id === id)?.name || "—";
  const ageGroupLabel = (id: string) => typedAgeGroups.find(item => item.id === id)?.label || "—";

  const beneficiaryRows = ageGroupIds.map(id => ({
    label: ageGroupLabel(id),
    male: typedBeneficiaries.find(item => item.age_group_id === id && item.sex === "male")?.count || 0,
    female: typedBeneficiaries.find(item => item.age_group_id === id && item.sex === "female")?.count || 0,
  }));

  const pdfBytes = await renderActivityReportReport({
    reportCode: typedReport.id,
    siteName: typedSite?.name || "—",
    periodStart: typedReport.period_start,
    periodEnd: typedReport.period_end,
    rationDaysProvided: typedReport.ration_days_provided,
    amountFigures: typedReport.amount_distributed_figures,
    amountWords: typedReport.amount_distributed_words,
    currency: typedReport.amount_distributed_currency,
    comment: typedReport.comment,
    products: typedProducts.map(row => ({
      productName: productName(row.product_id), startQty: row.start_qty ?? null, receivedQty: row.received_qty ?? null,
      distributedQty: row.distributed_qty ?? null, damagedQty: row.damaged_qty ?? null, returnedQty: row.returned_qty ?? null, remainingQty: row.remaining_qty ?? null,
    })),
    beneficiaries: beneficiaryRows,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="rapport-distribution-${typedReport.id}.pdf"` },
  });
}
