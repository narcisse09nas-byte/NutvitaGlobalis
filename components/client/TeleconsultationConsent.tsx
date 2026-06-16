"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TeleconsultationConsent({ userId, accepted }: { userId: string; accepted: boolean }) {
  const [signed, setSigned] = useState(accepted);
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!signature.trim()) {
      setMessage("Veuillez saisir votre nom complet pour signer.");
      return;
    }
    const { error } = await createClient().from("user_consents").upsert({
      user_id: userId,
      consent_type: "teleconsultation",
      accepted: true,
      signature_text: signature.trim(),
      signed_at: new Date().toISOString(),
      source: "checkout",
      version: "1.0",
    });
    if (error) setMessage(error.message);
    else {
      setSigned(true);
      setMessage("Consentement signe et enregistre.");
      window.location.reload();
    }
  }

  return <section className="mt-6 rounded-2xl border border-leaf/20 bg-mint p-5">
    <h2 className="font-black text-forest">Consentement eclaire de teleconsultation</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">
      Avant la premiere consultation, vous confirmez comprendre que le teleconseil nutritionnel ne remplace pas une urgence medicale, un diagnostic medical ou une prescription.
    </p>
    {signed ? <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-leaf">Consentement signe.</p> : <div className="mt-4 grid gap-3">
      <input value={signature} onChange={event => setSignature(event.target.value)} className="admin-input bg-white" placeholder="Signature electronique : nom complet" />
      <button type="button" onClick={submit} className="btn-primary justify-self-start">Signer le consentement</button>
    </div>}
    {message && <p className="mt-3 text-sm font-bold text-forest">{message}</p>}
  </section>;
}
