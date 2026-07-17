import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isVerifiedPayment, verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";

export async function verifyAndFinalizeFlutterwaveOrder(transactionId: string, expectedReference?: string) {
  const admin = createSupabaseAdminClient();
  const verification = await verifyFlutterwaveTransaction(transactionId);
  const reference = expectedReference ?? verification.tx_ref;
  const { data: order, error: orderError } = await admin.from("orders").select("id, transaction_reference, total, currency, status").eq("transaction_reference", reference).single();
  if (orderError || !order) throw new Error("Commande correspondante introuvable.");
  if (!isVerifiedPayment(verification, { reference: order.transaction_reference, amount: Number(order.total), currency: order.currency })) throw new Error("La transaction ne correspond pas à la commande.");
  const { data: orderId, error: finalizeError } = await admin.rpc("finalize_verified_order", {
    target_reference: order.transaction_reference,
    target_provider_transaction_id: String(verification.id),
    verified_amount: Number(verification.amount),
    verified_currency: verification.currency,
    raw_provider_payload: verification,
  });
  if (finalizeError) throw finalizeError;
  return { orderId: String(orderId), reference: order.transaction_reference };
}
