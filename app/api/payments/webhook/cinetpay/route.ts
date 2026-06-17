import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePayment } from "@/lib/payment-finalization";
import { finishWebhookLog, notifyPaymentFailure, startWebhookLog } from "@/lib/payment-webhook";

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const transactionId = String(payload.cpm_trans_id || payload.transaction_id || payload.trans_id || "");
  const admin = createAdminClient();
  const logId = await startWebhookLog(admin, "cinetpay", "payment.notification", payload as Record<string, any>, String(payload.cpm_payid || ""), transactionId);
  try {
    if (!transactionId) {
      await finishWebhookLog(admin, logId, "ignored");
      return NextResponse.json({ received: true });
    }

    const apiKey = process.env.CINETPAY_API_KEY, siteId = process.env.CINETPAY_SITE_ID;
    if (!apiKey || !siteId) throw new Error("CinetPay n est pas configure.");
    const check = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId })
    });
    const verified = await check.json();
    const { data: payment } = await admin.from("payments").select("*").eq("checkout_reference", transactionId).single();
    const status = String(verified.data?.status || payload.cpm_result || "").toUpperCase();
    if (payment && status === "ACCEPTED" && String(verified.data?.currency || payment.currency) === payment.currency && Number(verified.data?.amount || payment.total_including_tax) >= Number(payment.total_including_tax)) {
      await finalizePayment(admin, payment.id, String(verified.data?.payment_token || verified.data?.operator_id || transactionId), verified);
      await finishWebhookLog(admin, logId, "processed", payment.id);
    } else if (payment && ["REFUSED", "CANCELLED", "CANCELED"].includes(status)) {
      await admin.from("payments").update({ status: status.includes("CANCEL") ? "cancelled" : "failed", raw_event: verified }).eq("id", payment.id).eq("status", "pending");
      await notifyPaymentFailure(admin, payment.id);
      await finishWebhookLog(admin, logId, "processed", payment.id);
    } else {
      await finishWebhookLog(admin, logId, "ignored", payment?.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await finishWebhookLog(admin, logId, "failed", undefined, error);
    return NextResponse.json({ message: "Traitement impossible." }, { status: 500 });
  }
}
