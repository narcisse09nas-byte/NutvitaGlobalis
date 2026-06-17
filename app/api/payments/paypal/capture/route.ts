import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePayment } from "@/lib/payment-finalization";
import { notifyPaymentFailure } from "@/lib/payment-webhook";

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal n est pas configure.");
  const base = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description || "Connexion PayPal impossible.");
  return { token: result.access_token as string, base };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id");
  const orderId = url.searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  if (!paymentId || !orderId) return NextResponse.redirect(`${siteUrl}/espace-client?paiement=erreur`);

  const admin = createAdminClient();
  try {
    const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).eq("status", "pending").single();
    if (!payment) return NextResponse.redirect(`${siteUrl}/espace-client?paiement=introuvable`);
    const { token, base } = await paypalAccessToken();
    const response = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const result = await response.json();
    const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
    if (!response.ok || result.status !== "COMPLETED" || String(capture?.status) !== "COMPLETED") throw new Error(result.message || "Capture PayPal impossible.");
    await finalizePayment(admin, payment.id, String(capture.id || orderId), result);
    return NextResponse.redirect(`${siteUrl}/espace-client?paiement=succes`);
  } catch (error) {
    if (paymentId) {
      await admin.from("payments").update({ status: "failed", raw_event: { error: error instanceof Error ? error.message : String(error) } }).eq("id", paymentId).eq("status", "pending");
      await notifyPaymentFailure(admin, paymentId);
    }
    return NextResponse.redirect(`${siteUrl}/espace-client?paiement=erreur`);
  }
}
