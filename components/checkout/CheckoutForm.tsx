"use client";

import { useState } from "react";

type CheckoutType = "subscription" | "formation" | "consultation" | "medical_consultation";
type Provider = "cinetpay" | "paypal" | "manual_mobile_money" | "manual_bank_transfer";

export default function CheckoutForm({
  type,
  id,
  childId,
  disabled = false,
  locale = "fr",
}: {
  type: CheckoutType;
  id: string;
  childId?: string;
  disabled?: boolean;
  locale?: "fr" | "en";
}) {
  const en = locale === "en";
  const [provider, setProvider] = useState<Provider>("cinetpay");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startCheckout() {
    if (disabled || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_type: type,
          product_id: type === "subscription" ? undefined : id,
          plan_id: type === "subscription" ? id : undefined,
          child_id: childId,
          provider,
          promo_code: promoCode.trim() || undefined,
        }),
      });
      const result = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.message || (en ? "Payment could not be started." : "Le paiement n’a pas pu être initié."));
      }
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : en ? "Payment unavailable." : "Paiement indisponible.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-[#003d2f]">{en ? "Choose a payment method" : "Choisissez un moyen de paiement"}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {en ? "Your access is activated after payment confirmation." : "Votre accès est activé après confirmation du paiement."}
        </p>
      </div>

      <label className="block text-sm font-bold text-slate-800">
        {en ? "Payment method" : "Moyen de paiement"}
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value as Provider)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-[#087a52] focus:ring-2 focus:ring-emerald-100"
        >
          <option value="cinetpay">CinetPay · Mobile Money / carte</option>
          <option value="paypal">PayPal</option>
          <option value="manual_mobile_money">{en ? "Manual Mobile Money" : "Mobile Money manuel"}</option>
          <option value="manual_bank_transfer">{en ? "Bank transfer" : "Virement bancaire"}</option>
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-800">
        {en ? "Promoter code (optional)" : "Code promoteur (facultatif)"}
        <input
          value={promoCode}
          onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
          placeholder="NVG001P"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-[#087a52] focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      {message ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</p> : null}

      <button
        type="button"
        onClick={startCheckout}
        disabled={disabled || loading}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (en ? "Redirecting…" : "Redirection…") : en ? "Continue to payment" : "Continuer vers le paiement"}
      </button>
    </div>
  );
}
