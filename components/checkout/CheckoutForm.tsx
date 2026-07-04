"use client";
import { useState } from "react";

export default function CheckoutForm({ type, id, childId, disabled = false,locale="fr" }: { type: "subscription" | "formation" | "consultation"; id: string; childId?: string; disabled?: boolean;locale?:"fr"|"en" }) {
  const en=locale==="en",tx=(fr:string,english:string)=>en?english:fr;
  const [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  async function pay() {
    if (disabled) {
      setMessage(tx("Veuillez signer le consentement requis avant de continuer.","Please sign the required consent before continuing."));
      return;
    }
    setLoading(true); setMessage("");
    try {
      const payload = type === "subscription" ? { plan_id: id, child_id: childId, provider: "manual_mobile_money" } : { purchase_type: type, product_id: id, provider: "manual_mobile_money" };
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({ message: "Le serveur a retourne une reponse invalide." }));
      if (response.ok && result.url) location.href = result.url;
      else setMessage(result.message || "Activation indisponible.");
    } catch {
      setMessage("Le service d activation est temporairement inaccessible. Verifiez votre connexion puis reessayez.");
    } finally {
      setLoading(false);
    }
  }
  return <div><h2 className="text-lg font-black">{tx("Activation gratuite temporaire","Temporary free activation")}</h2><p className="mt-3 rounded-xl bg-mint p-4 text-sm leading-6 text-forest">{tx("Les paiements sont mis en stand-by pendant la finalisation juridique de NutVitaGlobalis. La creation du compte reste obligatoire, puis le service est active gratuitement pour le moment.","Payments are paused while NutVitaGlobalis completes its legal setup. Account creation remains required, and the service is currently activated free of charge.")}</p>{message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button onClick={pay} disabled={loading || disabled} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? tx("Activation...","Activating...") : disabled ? tx("Consentement requis","Consent required") : tx("Activer gratuitement","Activate free access")}</button></div>;
}
