"use client";

import { useState } from "react";

export default function LegalSignatureBox({ documentId, documentKey, version, signatureType }: { documentId: string; documentKey: string; version: string; signatureType: string }) {
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sign() {
    if (!name.trim() || !accepted) {
      setMessage("Veuillez saisir votre nom complet et accepter la signature electronique.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/legal/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: documentId, document_key: documentKey, version, signature_type: signatureType, signer_name: name.trim(), accepted }) });
    const result = await response.json();
    setMessage(response.ok ? "Signature enregistree." : result.message || "Signature impossible.");
    setLoading(false);
  }

  return <section className="rounded-2xl border border-leaf/20 bg-mint p-6">
    <h2 className="text-2xl font-black">Signature electronique</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Votre nom, la date, l'heure, l'adresse IP, l'utilisateur et la version du document seront conserves comme preuve.</p>
    <label className="mt-4 grid gap-2 text-sm font-bold">Nom complet<input value={name} onChange={event => setName(event.target.value)} className="admin-input bg-white" /></label>
    <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 h-5 w-5" />Je reconnais avoir lu ce document et j'accepte de le signer electroniquement.</label>
    <button onClick={sign} disabled={loading || !name.trim() || !accepted} className="btn-primary mt-5 disabled:opacity-50">{loading ? "Signature..." : "Signer le document"}</button>
    {message && <p className="mt-4 font-bold text-forest">{message}</p>}
  </section>;
}
