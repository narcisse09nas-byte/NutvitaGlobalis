import { NextResponse } from "next/server";
import { requireMaximusApi } from "@/lib/maximus-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMaximusInvoicePdf } from "@/lib/maximus-invoice-pdf";

// Live-rendered on every "View" click (never a stored file), mirroring
// app/api/ppm/operations/invoices/export-pdf/route.ts — the PDF always reflects the invoice's
// current status (draft/submitted/endorsed), which is exactly what makes the PAYE watermark
// meaningful: it can only ever appear once the underlying row is actually 'endorsed'.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const invoiceId = url.searchParams.get("id") || "";
  const download = url.searchParams.get("download") === "1";
  if (!invoiceId) return NextResponse.json({ message: "Facture manquante." }, { status: 400 });

  const ctx = await requireMaximusApi("finance/invoicing", "viewer");
  if ("error" in ctx) return ctx.error;

  const admin = createAdminClient();
  const { data: invoice } = await admin.from("maximus_invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return NextResponse.json({ message: "Facture introuvable." }, { status: 404 });
  const { data: lines } = await admin.from("maximus_invoice_lines").select("*").eq("invoice_id", invoiceId).order("position");

  let party: { name: string; email?: string | null; phone?: string | null; address?: string | null; extraLine?: string | null };
  if (invoice.invoice_type === "pos_meals" && invoice.partner_vendor_id) {
    const { data: partner } = await admin.from("partner_vendor_registry").select("*").eq("id", invoice.partner_vendor_id).maybeSingle();
    party = { name: partner?.full_name || "Point de vente", email: partner?.email, phone: partner?.phone, address: [partner?.city, partner?.country].filter(Boolean).join(", ") };
  } else {
    party = { name: invoice.client_name || "Client", email: invoice.client_email, phone: invoice.client_phone, address: invoice.client_address };
  }

  const pdfBytes = await renderMaximusInvoicePdf(invoice, lines || [], party);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
