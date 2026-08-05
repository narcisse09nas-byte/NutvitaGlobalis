import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isVerifiedPayment, verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";

async function notifyPlatformCommission(email: string, amount: number, currency: string, reference: string) {
  const platformOrigin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN;
  const secret = process.env.ACADEMY_COMMISSION_WEBHOOK_SECRET;
  if (!platformOrigin || !secret) return;
  try {
    await fetch(`${platformOrigin}/api/promoters/academy-commission`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-academy-webhook-secret": secret },
      body: JSON.stringify({ email, amount, currency, reference }),
    });
  } catch (error) {
    console.error("Academy commission webhook failed", error);
  }
}

export async function verifyAndFinalizeFlutterwaveOrder(transactionId: string, expectedReference?: string) {
  const admin = createSupabaseAdminClient();
  const verification = await verifyFlutterwaveTransaction(transactionId);
  const reference = expectedReference ?? verification.tx_ref;
  const { data: order, error: orderError } = await admin.from("academy_orders").select("id, transaction_reference, total, currency, status, user_id, profiles(email)").eq("transaction_reference", reference).single();
  if (orderError || !order) throw new Error("Commande correspondante introuvable.");
  if (!isVerifiedPayment(verification, { reference: order.transaction_reference, amount: Number(order.total), currency: order.currency })) throw new Error("La transaction ne correspond pas à la commande.");
  const { data: orderId, error: finalizeError } = await admin.rpc("academy_finalize_verified_order", {
    target_reference: order.transaction_reference,
    target_provider_transaction_id: String(verification.id),
    verified_amount: Number(verification.amount),
    verified_currency: verification.currency,
    raw_provider_payload: verification,
  });
  if (finalizeError) throw finalizeError;
  const buyerEmail = (order as any).profiles?.email;
  if (buyerEmail) await notifyPlatformCommission(buyerEmail, Number(verification.amount), verification.currency, order.transaction_reference);
  return { orderId: String(orderId), reference: order.transaction_reference };
}
