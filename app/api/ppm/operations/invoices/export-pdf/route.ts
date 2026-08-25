import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderInvoiceReport } from "@/lib/ppm/ops-pdf";
import type { OpsCooperative, OpsDeliveryNote, OpsInvoice, OpsInvoiceStatus, OpsSite } from "@/lib/ppm/types";

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
  const invoiceId = String(body.invoice_id || "");
  if (!invoiceId) return NextResponse.json({ message: "Facture manquante." }, { status: 400 });

  const { data: invoice } = await supabase.from("ppm_ops_invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return NextResponse.json({ message: "Facture introuvable ou acces refuse." }, { status: 404 });
  const typedInvoice = invoice as OpsInvoice;

  const [{ data: site }, { data: cooperative }, { data: delivery }] = await Promise.all([
    supabase.from("ppm_ops_sites").select("*").eq("id", typedInvoice.site_id).maybeSingle(),
    typedInvoice.cooperative_id ? supabase.from("ppm_ops_cooperatives").select("*").eq("id", typedInvoice.cooperative_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("ppm_ops_delivery_notes").select("*").eq("id_pk", typedInvoice.delivery_note_id).maybeSingle(),
  ]);
  const typedSite = site as OpsSite | null;
  const typedCooperative = cooperative as OpsCooperative | null;
  const typedDelivery = delivery as OpsDeliveryNote | null;

  const pdfBytes = await renderInvoiceReport({
    invoiceNumber: typedInvoice.id,
    siteName: typedSite?.name || "—",
    cooperativeName: typedCooperative?.name,
    deliveryCode: typedDelivery?.code || "—",
    status: statusLabelsFr[typedInvoice.status] || typedInvoice.status,
    totalTonnage: typedInvoice.total_tonnage,
    costPerTonne: typedInvoice.cost_per_tonne,
    amountFigures: typedInvoice.amount_figures,
    amountWords: typedInvoice.amount_words,
    currency: typedInvoice.currency,
    paymentAccountType: typedInvoice.payment_account_type,
    paymentAccountName: typedInvoice.payment_account_name,
    paymentAccountNumber: typedInvoice.payment_account_number,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="facture-${typedInvoice.id.replace(/[/ °]/g, "-")}.pdf"` },
  });
}
