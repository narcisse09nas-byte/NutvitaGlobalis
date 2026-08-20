"use client";

import { useState } from "react";
import { Building2, CreditCard, Smartphone } from "lucide-react";

const methods = [
  { provider: "manual_bank_transfer", fr: "Virement bancaire", en: "Bank transfer", Icon: Building2 },
  { provider: "cinetpay", fr: "Carte de crédit", en: "Credit card", Icon: CreditCard },
  { provider: "manual_mobile_money", fr: "Mobile Money", en: "Mobile Money", Icon: Smartphone },
] as const;

export default function ConsultationPaymentOptions({ requestId, requestType, productId, english }: { requestId: string; requestType: "dietetic" | "medical"; productId: string; english: boolean }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  async function pay(provider: string) {
    setLoading(provider); setMessage("");
    const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      purchase_type: requestType === "medical" ? "medical_consultation" : "consultation",
      product_id: productId,
      request_id: requestId,
      request_type: requestType,
      provider,
    }) });
    const result = await response.json();
    setLoading("");
    if (!response.ok) return setMessage(result.message || (english ? "Payment could not be initiated." : "Le paiement n’a pas pu être initié."));
    location.href = result.url;
  }
  return <div className="grid gap-3">{methods.map(({ provider, fr, en, Icon }) => <button key={provider} type="button" disabled={Boolean(loading)} onClick={() => pay(provider)} className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-5 text-left font-black text-forest transition hover:border-leaf hover:bg-mint/40"><span className="flex items-center gap-3"><span className="rounded-xl bg-mint p-3 text-leaf"><Icon className="h-5 w-5" /></span>{english ? en : fr}</span><span>→</span></button>)}{message ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{message}</p> : null}</div>;
}
