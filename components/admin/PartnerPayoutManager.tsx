"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function PartnerPayoutManager({ partners, payouts: initial }: { partners: Row[]; payouts: Row[] }) {
  const [payouts, setPayouts] = useState(initial), [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, payload = Object.fromEntries(new FormData(form));
    const { data, error } = await createClient().from("partner_payouts").insert({ ...payload, amount: Number(payload.amount || 0), status: payload.status || "paid", paid_at: payload.status === "paid" ? new Date().toISOString() : null }).select("*, dietitian_profiles(full_name)").single();
    if (error) setMessage(error.message);
    else {
      setPayouts([data, ...payouts]);
      setMessage("Versement prestataire enregistre.");
      form.reset();
    }
  }

  return <div className="grid gap-6">
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
      <h2 className="text-xl font-black md:col-span-3">Nouveau paiement prestataire</h2>
      <label className="grid gap-2 text-sm font-bold">Partenaire<select name="partner_id" required className="admin-input"><option value="">Selectionner</option>{partners.map(p => <option key={p.id} value={p.id}>{p.full_name} - {p.payout_method || "compte non renseigne"}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Montant<input name="amount" type="number" min="0" required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Canal<select name="provider" className="admin-input"><option value="manual">Manuel</option><option value="paypal">PayPal</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Virement bancaire</option><option value="flutterwave">Flutterwave</option><option value="stripe">Stripe</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Debut periode<input name="period_start" type="date" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Fin periode<input name="period_end" type="date" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Statut<select name="status" className="admin-input"><option value="paid">Paye</option><option value="pending">En attente</option><option value="processing">En traitement</option><option value="failed">Echec</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Reference<input name="provider_reference" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Notes<input name="notes" className="admin-input" /></label>
      <button className="btn-primary justify-self-start md:col-span-3">Enregistrer le paiement</button>
      {message && <p className="text-sm font-bold text-leaf md:col-span-3">{message}</p>}
    </form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Partenaire</th><th className="p-4">Canal</th><th className="p-4">Reference</th><th className="p-4">Statut</th><th className="p-4 text-right">Montant</th></tr></thead><tbody>{payouts.map((x: any) => <tr key={x.id} className="border-t"><td className="p-4">{new Date(x.created_at).toLocaleDateString("fr-FR")}</td><td className="p-4">{x.dietitian_profiles?.full_name || partners.find(p => p.id === x.partner_id)?.full_name || "Partenaire"}</td><td className="p-4">{x.provider}</td><td className="p-4">{x.provider_reference || "-"}</td><td className="p-4">{x.status}</td><td className="p-4 text-right font-bold">{Number(x.amount).toLocaleString("fr-FR")} {x.currency}</td></tr>)}</tbody></table></div>
  </div>;
}
