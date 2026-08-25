import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDeliveryNoteReport } from "@/lib/ppm/ops-pdf";
import type { OpsDeliveryLine, OpsDeliveryNote, OpsDeliveryReceiver, OpsProduct, OpsSite } from "@/lib/ppm/types";

const statusLabelsFr: Record<string, string> = {
  draft: "Brouillon", submitted: "Expediee", received_pending: "Reception soumise", received_confirmed: "Reception confirmee",
  approved: "Approuvee", returned: "Retournee", rejected: "Rejetee",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const deliveryId = String(body.delivery_id || "");
  if (!deliveryId) return NextResponse.json({ message: "Livraison manquante." }, { status: 400 });

  const { data: delivery } = await supabase.from("ppm_ops_delivery_notes").select("*").eq("id_pk", deliveryId).maybeSingle();
  if (!delivery) return NextResponse.json({ message: "Livraison introuvable ou acces refuse." }, { status: 404 });
  const typedDelivery = delivery as OpsDeliveryNote;

  const [{ data: site }, { data: lines }, { data: receivers }] = await Promise.all([
    supabase.from("ppm_ops_sites").select("*").eq("id", typedDelivery.site_id).maybeSingle(),
    supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", deliveryId),
    supabase.from("ppm_ops_delivery_receivers").select("*").eq("delivery_note_id", deliveryId),
  ]);
  const typedSite = site as OpsSite | null;
  const typedLines = (lines || []) as OpsDeliveryLine[];
  const typedReceivers = (receivers || []) as OpsDeliveryReceiver[];

  const productIds = Array.from(new Set(typedLines.map(row => row.product_id)));
  const { data: products } = productIds.length ? await supabase.from("ppm_ops_products").select("*").in("id", productIds) : { data: [] as OpsProduct[] };
  const typedProducts = (products || []) as OpsProduct[];
  const productName = (id: string) => typedProducts.find(item => item.id === id)?.name || "—";

  const pdfBytes = await renderDeliveryNoteReport({
    deliveryCode: typedDelivery.code,
    parentReference: typedDelivery.po_id || typedDelivery.need_id || "—",
    siteName: typedSite?.name || "—",
    deliveryDate: typedDelivery.delivery_date,
    deliveredByName: typedDelivery.delivered_by_name,
    status: statusLabelsFr[typedDelivery.status] || typedDelivery.status,
    receivers: typedReceivers.map(item => item.full_name),
    lines: typedLines.map(row => ({
      productName: productName(row.product_id), quantityOrdered: row.quantity_ordered, quantityReceived: row.quantity_received ?? null,
      rejectedQuantity: row.rejected_quantity, conformity: row.conformity || null,
    })),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="bon-livraison-${typedDelivery.code}.pdf"` },
  });
}
