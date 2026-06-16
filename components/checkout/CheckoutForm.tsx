"use client";
import { useState } from "react";

export default function CheckoutForm({ type, id, disabled = false }: { type: "subscription" | "formation" | "consultation"; id: string; disabled?: boolean }) {
  const [provider, setProvider] = useState<"flutterwave" | "stripe">("flutterwave"), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  async function pay() {
    if (disabled) {
      setMessage("Veuillez signer le consentement requis avant de continuer.");
      return;
    }
    setLoading(true); setMessage("");
    const payload = type === "subscription" ? { plan_id: id, provider } : { purchase_type: type, product_id: id, provider };
    const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (response.ok && result.url) location.href = result.url; else setMessage(result.message || "Paiement indisponible.");
    setLoading(false);
  }
  return <div><h2 className="text-lg font-black">Moyen de paiement</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => setProvider("flutterwave")} className={`rounded-2xl border p-4 text-left ${provider === "flutterwave" ? "border-leaf bg-mint" : "bg-white"}`}><b>Flutterwave</b><p className="mt-1 text-xs text-slate-500">MTN Mobile Money, Orange Money, cartes et paiements locaux.</p></button><button onClick={() => setProvider("stripe")} className={`rounded-2xl border p-4 text-left ${provider === "stripe" ? "border-leaf bg-mint" : "bg-white"}`}><b>Stripe</b><p className="mt-1 text-xs text-slate-500">Cartes bancaires internationales.</p></button></div>{message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button onClick={pay} disabled={loading || disabled} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Redirection securisee..." : disabled ? "Consentement requis" : "Payer maintenant"}</button></div>;
}
