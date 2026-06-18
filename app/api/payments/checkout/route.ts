import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getApplicableTax, priceBreakdown } from "@/lib/taxes";
import {xofPerUsd,xofToUsd} from "@/lib/currency";

type Purchase = { type: "subscription" | "formation" | "consultation"; id: string; name: string; price: number; currency: string; duration: number; childId?: string };
type Provider = "cinetpay" | "paypal" | "manual_mobile_money" | "manual_bank_transfer";

function cinetpayAmount(amount: number) {
  return Math.ceil(amount / 5) * 5;
}

function cinetpayText(value: string, fallback: string) {
  return (value || fallback).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 .-]/g, " ").trim() || fallback;
}

function isSchemaCacheColumnError(error: { message?: string; code?: string } | null) {
  return Boolean(error && (error.code === "PGRST204" || error.message?.includes("schema cache")));
}

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const provider = (body.provider || "manual_mobile_money") as Provider;
  if (!["cinetpay", "paypal", "manual_mobile_money", "manual_bank_transfer"].includes(provider)) return NextResponse.json({ message: "Fournisseur invalide." }, { status: 400 });
  const dbProvider = provider.startsWith("manual_") ? "manual" : provider;
  const manualMethod = provider === "manual_mobile_money" ? "mobile_money" : provider === "manual_bank_transfer" ? "bank_transfer" : null;
  const { data: profile } = await supabase.from("client_profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ message: "Profil client introuvable." }, { status: 404 });

  let purchase: Purchase | null = null;
  if (body.plan_id) {
    const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", String(body.plan_id)).eq("active", true).single();
    if (plan) {
      let childId: string | undefined;
      if (plan.service_type === "child_growth" && body.child_id) {
        const { data: child } = await supabase.from("children").select("id").eq("id", String(body.child_id)).eq("parent_id", user.id).maybeSingle();
        if (!child) return NextResponse.json({ message: "Selectionnez un enfant valide." }, { status: 400 });
        childId = child.id;
      }
      purchase = { type: "subscription", id: plan.id, name: plan.name, price: Number(plan.price_excluding_tax ?? plan.amount), currency: plan.currency, duration: Math.max(1, Number(plan.duration_months || 12)), childId };
    }
  } else if (body.purchase_type === "formation") {
    const { data } = await supabase.from("formations").select("id,title,price").eq("id", String(body.product_id)).eq("status", "published").single();
    if (data) purchase = { type: "formation", id: data.id, name: data.title, price: Number(data.price || 50000), currency: "XOF", duration: 0 };
  } else if (body.purchase_type === "consultation") {
    const { data } = await supabase.from("teleconseils").select("id,name,price").eq("id", String(body.product_id)).eq("status", "active").single();
    const {data:previous}=await supabase.from('consultation_bookings').select('id').eq('client_id',user.id).eq('teleconseil_id',String(body.product_id)).limit(1).maybeSingle();
    if (data) purchase = { type: "consultation", id: data.id, name: `${previous?'Renouvellement ':''}Pack ${data.name} - 3 mois`, price: previous?Number(data.price || 15000):Number(data.price || 15000), currency: "XOF", duration: 3 };
  }
  if (!purchase) return NextResponse.json({ message: "Produit ou service introuvable." }, { status: 404 });

  const admin = createAdminClient(), tax = await getApplicableTax(admin, profile.country_code, purchase.type), sourceAmountXof = purchase.price, exchangeRate = xofPerUsd();
  const localPayment = provider === "cinetpay" || Boolean(manualMethod);
  const breakdown = localPayment ? priceBreakdown(sourceAmountXof, Number(tax.rate)) : priceBreakdown(xofToUsd(sourceAmountXof), Number(tax.rate));
  purchase.currency = localPayment ? "XAF" : "USD";
  const reference = `NVG${Date.now()}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  let subscriptionId: string | null = null;
  if (purchase.type === "subscription") {
    const { data, error } = await admin.from("subscriptions").insert({ client_id: user.id, child_id: purchase.childId || null, plan_id: purchase.id, provider: dbProvider, status: "pending", renewal_period_months: purchase.duration }).select().single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    subscriptionId = data.id;
  }
  const paymentPayload = { client_id: user.id, subscription_id: subscriptionId, provider: dbProvider, manual_method: manualMethod, checkout_reference: reference, amount: breakdown.totalIncludingTax, currency: purchase.currency, source_amount_xof:sourceAmountXof, exchange_rate_xof_per_usd:exchangeRate, price_excluding_tax: breakdown.priceExcludingTax, tax_rate: breakdown.taxRate, tax_amount: breakdown.taxAmount, total_including_tax: breakdown.totalIncludingTax, purchase_type: purchase.type, product_id: purchase.type === "subscription" ? null : purchase.id, product_name: purchase.name };
  let { data: payment, error: paymentError } = await admin.from("payments").insert(paymentPayload).select().single();
  if (isSchemaCacheColumnError(paymentError)) {
    const { source_amount_xof: _sourceAmount, exchange_rate_xof_per_usd: _exchangeRate, ...compatiblePayload } = paymentPayload;
    const retry = await admin.from("payments").insert(compatiblePayload).select().single();
    payment = retry.data;
    paymentError = retry.error;
  }
  if (paymentError || !payment) return NextResponse.json({ message: paymentError?.message || "Paiement impossible." }, { status: 500 });
  if (manualMethod) return NextResponse.json({ url: `/espace-client/paiements/${payment.id}` });

  try {
    const origin = new URL(request.url).origin;
    let url = "";
    if (provider === "cinetpay") {
      const apiKey = process.env.CINETPAY_API_KEY, siteId = process.env.CINETPAY_SITE_ID;
      if (!apiKey || !siteId) throw new Error("CinetPay n est pas configure.");
      const customerName = cinetpayText(String(profile.full_name || user.email), "Client NutVitaGlobalis");
      const [firstName, ...rest] = customerName.split(/\s+/);
      const amount = cinetpayAmount(Number(breakdown.totalIncludingTax));
      const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "NutVitaGlobalis/1.0" },
        body: JSON.stringify({
          apikey: apiKey,
          site_id: siteId,
          transaction_id: reference,
          amount,
          currency: purchase.currency,
          description: cinetpayText(purchase.name, "Service NutVitaGlobalis"),
          customer_id: user.id,
          customer_name: firstName || "Client",
          customer_surname: rest.join(" ") || "NutVitaGlobalis",
          customer_email: user.email,
          customer_phone_number: profile.whatsapp_phone || profile.phone || "",
          customer_address: cinetpayText(profile.address || profile.city, "Douala"),
          customer_city: cinetpayText(profile.city, "Douala"),
          customer_country: profile.country_code || "CM",
          customer_state: profile.country_code || "CM",
          customer_zip_code: profile.postal_code || "00000",
          notify_url: `${origin}/api/payments/webhook/cinetpay`,
          return_url: `${origin}/espace-client?paiement=retour`,
          channels: "ALL",
          metadata: JSON.stringify({ payment_id: payment.id, purchase_type: purchase.type })
        })
      });
      const result = await response.json();
      if (!response.ok || !["201", "00"].includes(String(result.code))) throw new Error(result.message || "CinetPay indisponible.");
      url = result.data?.payment_url;
    } else {
      const { token, base } = await paypalAccessToken();
      const response = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{ reference_id: reference, custom_id: payment.id, description: purchase.name, amount: { currency_code: purchase.currency, value: Number(breakdown.totalIncludingTax).toFixed(2) } }],
          application_context: { brand_name: "NutVitaGlobalis", landing_page: "LOGIN", user_action: "PAY_NOW", return_url: `${origin}/api/payments/paypal/capture?payment_id=${payment.id}`, cancel_url: `${origin}/checkout?type=${purchase.type}&id=${purchase.id}&paiement=annule` }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "PayPal indisponible.");
      await admin.from("payments").update({ provider_payment_id: result.id }).eq("id", payment.id);
      url = result.links?.find((link: any) => link.rel === "approve")?.href;
    }
    if (!url) throw new Error("Lien de paiement indisponible.");
    return NextResponse.json({ url });
  } catch (error) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Paiement indisponible." }, { status: 500 });
  }
}
