"use client";
import { useState } from "react";

export default function CheckoutForm({ type, id, disabled = false }: { type: "subscription" | "formation" | "consultation"; id: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  async function pay() {
    if (disabled) {
      setMessage("Veuillez signer le consentement requis avant de continuer.");
      return;
    }
    setLoading(true); setMessage("");
    const payload = type === "subscription" ? { plan_id: id, provider: "flutterwave" } : { purchase_type: type, product_id: id, provider: "flutterwave" };
    const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (response.ok && result.url) location.href = result.url; else setMessage(result.message || "Paiement indisponible.");
    setLoading(false);
  }
  return <div><h2 className="text-lg font-black">Moyen de paiement</h2><div className="mt-4 rounded-2xl border border-leaf bg-mint p-4 text-left"><b>Flutterwave</b><p className="mt-1 text-xs text-slate-500">MTN Mobile Money, Orange Money, cartes et paiements locaux.</p></div>{message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button onClick={pay} disabled={loading || disabled} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Redirection securisee..." : disabled ? "Consentement requis" : "Payer maintenant"}</button></div>;
}
