import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getApplicableTax, priceBreakdown } from "@/lib/taxes";
import {xofPerUsd,xofToUsd} from "@/lib/currency";

type Purchase = { type: "subscription" | "formation" | "consultation"; id: string; name: string; price: number; currency: string; duration: number; childId?: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  if (!["stripe", "flutterwave"].includes(body.provider)) return NextResponse.json({ message: "Fournisseur invalide." }, { status: 400 });
  const { data: profile } = await supabase.from("client_profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ message: "Profil client introuvable." }, { status: 404 });

  let purchase: Purchase | null = null;
  if (body.plan_id) {
    const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", String(body.plan_id)).eq("active", true).single();
    if (plan) {
      if (plan.service_type === "child_growth") {
        const { data: child } = await supabase.from("children").select("id").eq("id", String(body.child_id || "")).eq("parent_id", user.id).maybeSingle();
        if (!child) return NextResponse.json({ message: "Selectionnez un enfant valide." }, { status: 400 });
      }
      purchase = { type: "subscription", id: plan.id, name: plan.name, price: Number(plan.price_excluding_tax ?? plan.amount), currency: plan.currency, duration: Math.max(1, Number(plan.duration_months || 12)), childId: plan.service_type === "child_growth" ? body.child_id : undefined };
    }
  } else if (body.purchase_type === "formation") {
    const { data } = await supabase.from("formations").select("id,title,price").eq("id", String(body.product_id)).eq("status", "published").single();
    if (data) purchase = { type: "formation", id: data.id, name: data.title, price: Number(data.price || 50000), currency: "XOF", duration: 0 };
  } else if (body.purchase_type === "consultation") {
    const { data } = await supabase.from("teleconseils").select("id,name,price").eq("id", String(body.product_id)).eq("status", "active").single();
    const {data:previous}=await supabase.from('consultation_bookings').select('id').eq('client_id',user.id).eq('teleconseil_id',String(body.product_id)).limit(1).maybeSingle();
    if (data) purchase = { type: "consultation", id: data.id, name: `${previous?'Renouvellement ':''}Pack ${data.name} - 3 mois`, price: previous?10000:Number(data.price || 15000), currency: "XOF", duration: 3 };
  }
  if (!purchase) return NextResponse.json({ message: "Produit ou service introuvable." }, { status: 404 });

  const admin = createAdminClient(), tax = await getApplicableTax(admin, profile.country_code, purchase.type),sourceAmountXof=purchase.price,exchangeRate=xofPerUsd(),breakdown = priceBreakdown(xofToUsd(sourceAmountXof), Number(tax.rate));
  purchase.currency="USD";
  const reference = `NVG-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  let subscriptionId: string | null = null;
  if (purchase.type === "subscription") {
    const { data, error } = await admin.from("subscriptions").insert({ client_id: user.id, child_id: purchase.childId || null, plan_id: purchase.id, provider: body.provider, status: "pending", renewal_period_months: purchase.duration }).select().single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    subscriptionId = data.id;
  }
  const { data: payment, error: paymentError } = await admin.from("payments").insert({ client_id: user.id, subscription_id: subscriptionId, provider: body.provider, checkout_reference: reference, amount: breakdown.totalIncludingTax, currency: purchase.currency, source_amount_xof:sourceAmountXof, exchange_rate_xof_per_usd:exchangeRate, price_excluding_tax: breakdown.priceExcludingTax, tax_rate: breakdown.taxRate, tax_amount: breakdown.taxAmount, total_including_tax: breakdown.totalIncludingTax, purchase_type: purchase.type, product_id: purchase.type === "subscription" ? null : purchase.id, product_name: purchase.name }).select().single();
  if (paymentError) return NextResponse.json({ message: paymentError.message }, { status: 500 });

  try {
    const origin = new URL(request.url).origin;
    let url = "";
    if (body.provider === "stripe") {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) throw new Error("Stripe n est pas configure.");
      const form = new URLSearchParams({ mode: "payment", success_url: `${origin}/espace-client?paiement=succes`, cancel_url: `${origin}/checkout?type=${purchase.type}&id=${purchase.id}&paiement=annule`, customer_email: user.email, client_reference_id: reference, "line_items[0][price_data][currency]": purchase.currency.toLowerCase(), "line_items[0][price_data][product_data][name]": purchase.name, "line_items[0][price_data][unit_amount]": String(Math.round(breakdown.totalIncludingTax*100)), "line_items[0][quantity]": "1", "metadata[payment_id]": payment.id });
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Stripe indisponible.");
      url = result.url;
    } else {
      const secret = process.env.FLUTTERWAVE_SECRET_KEY;
      if (!secret) throw new Error("Flutterwave n est pas configure.");
      const response = await fetch("https://api.flutterwave.com/v3/payments", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ tx_ref: reference, amount: breakdown.totalIncludingTax, currency: purchase.currency, redirect_url: `${origin}/espace-client?paiement=retour`, payment_options: "card,mobilemoneyghana,mpesa,ussd,account", customer: { email: user.email, name: profile.full_name || user.email, phonenumber: profile.whatsapp_phone || profile.phone }, customizations: { title: "NutVitaGlobalis", description: purchase.name }, meta: { payment_id: payment.id, purchase_type: purchase.type } }) });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Flutterwave indisponible.");
      url = result.data.link;
    }
    return NextResponse.json({ url });
  } catch (error) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Paiement indisponible." }, { status: 500 });
  }
}
