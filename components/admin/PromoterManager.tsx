"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function PromoterManager({ promoters, balances, payouts: initialPayouts, ledger }: { promoters: Row[]; balances: Row[]; payouts: Row[]; ledger: Row[] }) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState("");

  const balanceFor = useMemo(() => new Map(balances.map(row => [row.promoter_id, row])), [balances]);
  const currentBalance = selectedPromoter ? Number(balanceFor.get(selectedPromoter)?.balance || 0) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const promoterId = String(formData.get("promoter_id") || "");
    const amount = Number(formData.get("amount") || 0);
    const balance = Number(balanceFor.get(promoterId)?.balance || 0);
    if (amount <= 0) { setMessage("Le montant doit être positif."); return; }
    if (amount > balance) { setMessage(`Montant supérieur à la cagnote disponible (${balance.toLocaleString("fr-FR")}).`); return; }
    setUploading(true);
    const supabase = createClient();
    let proofPath: string | null = null;
    const file = formData.get("proof") as File | null;
    if (file && file.size > 0) {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `${promoterId}/${crypto.randomUUID()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from("promoter-payout-proofs").upload(path, file);
      if (uploadError) { setMessage(uploadError.message); setUploading(false); return; }
      proofPath = path;
    }
    const payload = {
      promoter_id: promoterId,
      amount,
      currency: String(formData.get("currency") || "XOF"),
      provider: String(formData.get("provider") || "manual"),
      provider_reference: String(formData.get("provider_reference") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      proof_file_path: proofPath,
      status: "paid",
      paid_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("promoter_payouts").insert(payload).select("*, promoter_profiles(full_name,matricule)").single();
    setUploading(false);
    if (error) { setMessage(error.message); return; }
    setPayouts([data, ...payouts]);
    setMessage("Versement enregistré.");
    form.reset();
    setSelectedPromoter("");
  }

  async function openProof(path: string) {
    const { data, error } = await createClient().storage.from("promoter-payout-proofs").createSignedUrl(path, 300);
    if (error) setMessage(error.message); else window.open(data.signedUrl, "_blank");
  }

  return <div className="grid gap-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {promoters.map(promoter => {
        const balance = balanceFor.get(promoter.id);
        return <article key={promoter.id} className="rounded-2xl border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{promoter.matricule}</p>
          <h3 className="mt-1 font-black text-forest">{promoter.full_name}</h3>
          <p className="mt-3 text-2xl font-black text-leaf">{Number(balance?.balance || 0).toLocaleString("fr-FR")} <span className="text-sm text-slate-400">FCFA</span></p>
          <p className="text-xs text-slate-400">Cagnote disponible</p>
          <p className="mt-2 text-xs text-slate-400">Total gagné : {Number(balance?.total_earned || 0).toLocaleString("fr-FR")} · Déjà versé : {Number(balance?.total_paid_out || 0).toLocaleString("fr-FR")}</p>
        </article>;
      })}
      {!promoters.length && <p className="text-slate-400">Aucun promoteur actif.</p>}
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">Nouveau versement à un promoteur</h2>
      <p className="mt-1 text-sm text-slate-500">Le montant est automatiquement plafonné à la cagnote disponible du promoteur.</p>
      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">Promoteur
          <select name="promoter_id" required className="admin-input" value={selectedPromoter} onChange={e => setSelectedPromoter(e.target.value)}>
            <option value="">Sélectionner</option>
            {promoters.map(p => <option key={p.id} value={p.id}>{p.matricule} - {p.full_name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">Montant {selectedPromoter && <span className="font-normal text-slate-400">(max {currentBalance.toLocaleString("fr-FR")})</span>}
          <input name="amount" type="number" min="0" max={selectedPromoter ? currentBalance : undefined} step="0.01" required className="admin-input" />
        </label>
        <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue="XOF" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Canal<select name="provider" className="admin-input"><option value="manual">Manuel</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Virement bancaire</option><option value="paypal">PayPal</option></select></label>
        <label className="grid gap-2 text-sm font-bold">Référence<input name="provider_reference" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Preuve de versement<input name="proof" type="file" accept=".pdf,.jpg,.jpeg,.png" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold md:col-span-3">Notes<input name="notes" className="admin-input" /></label>
        <button disabled={uploading} className="btn-primary justify-self-start md:col-span-3">{uploading ? "Enregistrement..." : "Enregistrer le versement"}</button>
      </form>
      {message && <p className="mt-4 rounded-xl bg-mint p-4 text-sm font-bold text-forest">{message}</p>}
    </section>

    <section className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[820px] text-left">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Promoteur</th><th className="p-4">Canal</th><th className="p-4">Référence</th><th className="p-4">Preuve</th><th className="p-4 text-right">Montant</th></tr></thead>
        <tbody>
          {payouts.map(payout => <tr key={payout.id} className="border-b">
            <td className="p-4">{new Date(payout.created_at).toLocaleDateString("fr-FR")}</td>
            <td className="p-4">{payout.promoter_profiles?.matricule} - {payout.promoter_profiles?.full_name}</td>
            <td className="p-4">{payout.provider}</td>
            <td className="p-4">{payout.provider_reference || "-"}</td>
            <td className="p-4">{payout.proof_file_path ? <button onClick={() => openProof(payout.proof_file_path)} className="font-bold text-leaf">Voir ↗</button> : "-"}</td>
            <td className="p-4 text-right font-bold">{Number(payout.amount).toLocaleString("fr-FR")} {payout.currency}</td>
          </tr>)}
          {!payouts.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucun versement enregistré.</td></tr>}
        </tbody>
      </table>
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">Historique des commissions</h2>
      <div className="mt-4 grid gap-2">
        {ledger.slice(0, 20).map(entry => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
          <span>{entry.description} <span className="text-xs text-slate-400">({entry.source === "academy" ? "Academy" : "Site principal"})</span></span>
          <b className="text-leaf">+{Number(entry.amount).toLocaleString("fr-FR")} {entry.currency}</b>
        </div>)}
        {!ledger.length && <p className="text-slate-400">Aucune commission enregistrée.</p>}
      </div>
    </section>
  </div>;
}
