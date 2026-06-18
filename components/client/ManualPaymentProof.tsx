"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ManualPaymentProof({ paymentId, userId, alreadySubmitted }: { paymentId: string; userId: string; alreadySubmitted: boolean }) {
  const [message, setMessage] = useState(""), [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, fd = new FormData(form), file = fd.get("proof") as File | null;
    setLoading(true); setMessage("");
    if ((!file || file.size === 0) && !String(fd.get("proof_reference") || "").trim()) {
      setMessage("Ajoutez au moins une reference de transaction ou un recu/capture.");
      setLoading(false);
      return;
    }
    let proof_path = "";
    if (file && file.size > 0) {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      proof_path = `${userId}/payment-proofs/${paymentId}-${crypto.randomUUID()}-${safe}`;
      const upload = await createClient().storage.from("document-vault").upload(proof_path, file, { contentType: file.type || "application/octet-stream" });
      if (upload.error) { setMessage(upload.error.message); setLoading(false); return; }
    }
    const response = await fetch("/api/payments/manual-proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payment_id: paymentId, proof_path, proof_reference: fd.get("proof_reference"), proof_notes: fd.get("proof_notes") }) });
    const result = await response.json();
    setMessage(response.ok ? "Preuve envoyee. L equipe NutVitaGlobalis verifiera le paiement." : result.message);
    if (response.ok) form.reset();
    setLoading(false);
  }
  return <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border bg-white p-5">
    <h2 className="text-xl font-black">Envoyer la preuve de paiement</h2>
    {alreadySubmitted && <p className="rounded-xl bg-mint p-3 text-sm text-forest">Une preuve a deja ete envoyee. Vous pouvez la remplacer si necessaire.</p>}
    <label className="grid gap-2 text-sm font-bold">Reference de transaction<input name="proof_reference" className="admin-input" placeholder="Ex: PP250617.1234.A12345" /></label>
    <label className="grid gap-2 text-sm font-bold">Capture ou recu<input name="proof" type="file" accept=".pdf,.jpg,.jpeg,.png" className="admin-input" /></label>
    <label className="grid gap-2 text-sm font-bold">Notes<textarea name="proof_notes" className="admin-input min-h-24" placeholder="Numero utilise, heure du paiement, commentaire..." /></label>
    {message && <p className="rounded-xl bg-slate-50 p-3 text-sm">{message}</p>}
    <button disabled={loading} className="btn-primary">{loading ? "Envoi..." : "Envoyer la preuve"}</button>
  </form>;
}
