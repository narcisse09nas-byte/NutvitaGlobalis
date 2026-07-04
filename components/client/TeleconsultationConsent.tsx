"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TeleconsultationConsent({ userId, accepted,locale="fr" }: { userId: string; accepted: boolean;locale?:"fr"|"en" }) {
  const en=locale==="en",tx=(fr:string,english:string)=>en?english:fr;
  const [signed, setSigned] = useState(accepted);
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!signature.trim()) {
      setMessage(tx("Veuillez saisir votre nom complet pour signer.","Enter your full name to sign."));
      return;
    }
    const supabase = createClient();
    const { data: legal } = await supabase.from("legal_documents").select("id,current_version").eq("document_key", "consentement-teleconsultation").eq("status", "published").maybeSingle();
    const { error } = await supabase.from("user_consents").upsert({
      user_id: userId,
      legal_document_id: legal?.id || null,
      consent_type: "teleconsultation",
      accepted: true,
      signature_text: signature.trim(),
      signed_at: new Date().toISOString(),
      source: "checkout",
      version: legal?.current_version || "1.0",
    }, { onConflict: "user_id,consent_type" });
    if (error) setMessage(error.message);
    else {
      setSigned(true);
      setMessage(tx("Consentement signe et enregistre.","Consent signed and saved."));
      window.location.reload();
    }
  }

  return <section className="mt-6 rounded-2xl border border-leaf/20 bg-mint p-5">
    <h2 className="font-black text-forest">{tx("Consentement eclaire de teleconsultation","Informed teleconsultation consent")}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">
      {tx("Avant la premiere consultation, vous confirmez comprendre que le teleconseil nutritionnel ne remplace pas une urgence medicale, un diagnostic medical ou une prescription.","Before the first consultation, you confirm that nutritional teleadvice does not replace emergency care, medical diagnosis or a prescription.")}
    </p>
    {signed ? <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-leaf">{tx("Consentement signe.","Consent signed.")}</p> : <div className="mt-4 grid gap-3">
      <input value={signature} onChange={event => setSignature(event.target.value)} className="admin-input bg-white" placeholder={tx("Signature electronique : nom complet","Electronic signature: full name")} />
      <button type="button" onClick={submit} className="btn-primary justify-self-start">{tx("Signer le consentement","Sign consent")}</button>
    </div>}
    {message && <p className="mt-3 text-sm font-bold text-forest">{message}</p>}
  </section>;
}
