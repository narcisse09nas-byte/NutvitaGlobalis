"use client";
import { useState } from "react";

export default function CheckoutForm({ type, id, childId, disabled = false }: { type: "subscription" | "formation" | "consultation"; id: string; childId?: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  async function pay() {
    if (disabled) {
      setMessage("Veuillez signer le consentement requis avant de continuer.");
      return;
    }
    setLoading(true); setMessage("");
    const payload = type === "subscription" ? { plan_id: id, child_id: childId, provider: "manual_mobile_money" } : { purchase_type: type, product_id: id, provider: "manual_mobile_money" };
    const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (response.ok && result.url) location.href = result.url; else setMessage(result.message || "Activation indisponible.");
    setLoading(false);
  }
  return <div><h2 className="text-lg font-black">Activation gratuite temporaire</h2><p className="mt-3 rounded-xl bg-mint p-4 text-sm leading-6 text-forest">Les paiements sont mis en stand-by pendant la finalisation juridique de NutVitaGlobalis. La creation du compte reste obligatoire, puis le service est active gratuitement pour le moment.</p>{message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button onClick={pay} disabled={loading || disabled} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Activation..." : disabled ? "Consentement requis" : "Activer gratuitement"}</button></div>;
}
