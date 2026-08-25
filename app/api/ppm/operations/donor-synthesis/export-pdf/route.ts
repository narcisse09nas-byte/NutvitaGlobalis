import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDonorSynthesisReport } from "@/lib/ppm/ops-pdf";
import type { Operation, OpsInvoice, OpsInvoicePaymentTracking, OpsInvoiceStatus, OpsSite } from "@/lib/ppm/types";

const statusLabelsFr: Record<OpsInvoiceStatus, string> = {
  draft: "Brouillon", submitted: "Soumise", distribution_manager_endorsed: "Validee (resp. distribution)",
  school_endorsed: "Endossee (ecole)", in_synthesis: "Dans le fichier de synthese", paid_to_school: "Payee a l'ecole",
  paid_to_cooperative: "Payee a la cooperative", rejected: "Rejetee",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const operationId = String(body.operation_id || "");
  const periodStart = String(body.period_start || "");
  const periodEnd = String(body.period_end || "");
  const preparedByName = String(body.prepared_by_name || "").trim() || null;
  const approvedByName = String(body.approved_by_name || "").trim() || null;
  if (!operationId || !periodStart || !periodEnd) return NextResponse.json({ message: "Operation et periode requises." }, { status: 400 });

  const { data: hasAccess } = await supabase.rpc("ppm_ops_access", { p_operation_id: operationId });
  if (!hasAccess) return NextResponse.json({ message: "Autorisation insuffisante sur cette operation." }, { status: 403 });

  const { data: operation } = await supabase.from("ppm_ops_operations").select("*").eq("id", operationId).maybeSingle();
  if (!operation) return NextResponse.json({ message: "Operation introuvable." }, { status: 404 });
  const typedOperation = operation as Operation;

  const { data: invoices } = await supabase.from("ppm_ops_invoices").select("*, ppm_ops_sites!inner(operation_id)")
    .eq("ppm_ops_sites.operation_id", operationId).gte("created_at", periodStart).lte("created_at", `${periodEnd}T23:59:59`);
  const typedInvoices = (invoices || []) as OpsInvoice[];

  const [{ data: sites }, { data: tracking }] = await Promise.all([
    supabase.from("ppm_ops_sites").select("*").eq("operation_id", operationId),
    typedInvoices.length ? supabase.from("ppm_ops_invoice_payment_tracking").select("*").in("invoice_id", typedInvoices.map(item => item.id)) : Promise.resolve({ data: [] }),
  ]);
  const typedSites = (sites || []) as OpsSite[];
  const typedTracking = (tracking || []) as OpsInvoicePaymentTracking[];
  const siteName = (id: string) => typedSites.find(item => item.id === id)?.name || "—";
  const trackingFor = (invoiceId: string) => typedTracking.find(item => item.invoice_id === invoiceId);

  const rows = typedInvoices.map(invoice => ({
    siteName: siteName(invoice.site_id),
    invoiceId: invoice.id,
    amountFigures: invoice.amount_figures,
    currency: invoice.currency,
    status: statusLabelsFr[invoice.status] || invoice.status,
    paidToSchoolAt: trackingFor(invoice.id)?.paid_to_school_at,
    paidToCooperativeAt: trackingFor(invoice.id)?.paid_to_cooperative_at,
  }));

  const pdfBytes = await renderDonorSynthesisReport({
    operationName: typedOperation.name, periodStart, periodEnd, preparedByName, approvedByName, rows,
  });

  const filePath = `ppm/ops/donor-synthesis/${operationId}/${crypto.randomUUID()}.pdf`;
  await supabase.storage.from("document-vault").upload(filePath, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: false });
  await supabase.from("ppm_ops_donor_synthesis_exports").insert({
    operation_id: operationId, period_start: periodStart, period_end: periodEnd,
    prepared_by_name: preparedByName, approved_by_name: approvedByName, file_path: filePath, created_by: user.id,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="synthese-bailleur-${operationId}.pdf"` },
  });
}
