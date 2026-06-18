import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePayment } from "@/lib/payment-finalization";

export async function POST(request: Request) {
  const { user } = await requireAdmin();
  const body = await request.json();
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("*").eq("id", String(body.payment_id)).eq("provider", "manual").maybeSingle();
  if (!payment) return NextResponse.json({ message: "Paiement introuvable." }, { status: 404 });
  if (payment.status !== "pending") return NextResponse.json({ message: "Paiement deja traite." }, { status: 400 });
  if (body.action === "approve") {
    if (!payment.proof_submitted_at) return NextResponse.json({ message: "La preuve de paiement doit etre soumise avant validation." }, { status: 400 });
    await admin.from("payments").update({ manual_reviewed_by: user.id, manual_reviewed_at: new Date().toISOString(), manual_review_notes: String(body.notes || "") }).eq("id", payment.id);
    await finalizePayment(admin, payment.id, `manual-${payment.checkout_reference}`, { action: "manual_approved", reviewed_by: user.id, notes: body.notes || "" });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reject") {
    const { error } = await admin.from("payments").update({ status: "failed", manual_reviewed_by: user.id, manual_reviewed_at: new Date().toISOString(), manual_review_notes: String(body.notes || ""), raw_event: { action: "manual_rejected", reviewed_by: user.id, notes: body.notes || "" } }).eq("id", payment.id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: "Action invalide." }, { status: 400 });
}
