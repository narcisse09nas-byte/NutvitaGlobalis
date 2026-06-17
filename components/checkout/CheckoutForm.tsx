"use client";
import { useState } from "react";

export default function CheckoutForm({ type, id, disabled = false }: { type: "subscription" | "formation" | "consultation"; id: string; disabled?: boolean }) {
  const [provider, setProvider] = useState<"manual_mobile_money" | "manual_bank_transfer" | "cinetpay" | "paypal">("manual_mobile_money"), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
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
  return <div><h2 className="text-lg font-black">Moyen de paiement</h2><div className="mt-4 grid gap-3"><Choice active={provider==="manual_mobile_money"} onClick={()=>setProvider("manual_mobile_money")} title="Mobile Money manuel" text="MTN MoMo ou Orange Money. Acces active apres verification du recu."/><Choice active={provider==="manual_bank_transfer"} onClick={()=>setProvider("manual_bank_transfer")} title="Virement bancaire" text="Instructions privees apres creation de la reference de paiement."/><div className="grid gap-3 sm:grid-cols-2"><Choice active={provider==="cinetpay"} onClick={()=>setProvider("cinetpay")} title="CinetPay" text="Sandbox pour les tests, production apres validation."/><Choice active={provider==="paypal"} onClick={()=>setProvider("paypal")} title="PayPal" text="Option internationale, selon disponibilite du compte marchand."/></div></div>{message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button onClick={pay} disabled={loading || disabled} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Redirection securisee..." : disabled ? "Consentement requis" : provider.startsWith("manual_") ? "Obtenir les instructions" : "Payer maintenant"}</button></div>;
}

function Choice({active,onClick,title,text}:{active:boolean;onClick:()=>void;title:string;text:string}){return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left ${active?"border-leaf bg-mint":"bg-white"}`}><b>{title}</b><p className="mt-1 text-xs text-slate-500">{text}</p></button>}
