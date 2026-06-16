"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function PayPalPayoutManager({ partners, payouts: initial, adminId }: { partners: Row[]; payouts: Row[]; adminId: string }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const partner = partners.find(item => item.id === String(fd.get("partner_id")));
    const payload = { partner_id: String(fd.get("partner_id")), paypal_email: String(fd.get("paypal_email") || partner?.payout_paypal_email || ""), amount: Number(fd.get("amount") || 0), currency: String(fd.get("currency") || "USD"), period_start: String(fd.get("period_start") || "") || null, period_end: String(fd.get("period_end") || "") || null, purpose: String(fd.get("purpose") || "partner_revenue_share"), status: "ready", notes: String(fd.get("notes") || ""), generated_by: adminId };
    const { data, error } = await createClient().from("partner_paypal_payouts").insert(payload).select("*, dietitian_profiles(full_name)").single();
    if (error) setMessage(error.message);
    else {
      await createClient().from("partner_payouts").insert({ partner_id: payload.partner_id, amount: payload.amount, currency: payload.currency, provider: "paypal", status: "pending", period_start: payload.period_start, period_end: payload.period_end, provider_reference: data.id, notes: payload.notes });
      setRows([data, ...rows]);
      setMessage("Paiement PayPal genere en statut pret. Il sera execute lorsque le compte PayPal NutVitaGlobalis sera connecte.");
      form.reset();
    }
  }

  return <div className="grid gap-6">
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
      <div className="md:col-span-3"><h2 className="text-xl font-black">Generer un paiement PayPal partenaire</h2><p className="mt-1 text-sm text-slate-500">Prepare un versement via le compte PayPal NutVitaGlobalis. L'execution API sera activee au moment de connecter PayPal.</p></div>
      <label className="grid gap-2 text-sm font-bold">Partenaire<select name="partner_id" required className="admin-input"><option value="">Selectionner</option>{partners.map(partner => <option key={partner.id} value={partner.id}>{partner.full_name} - {partner.payout_paypal_email || "PayPal a renseigner"}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Email PayPal<input name="paypal_email" type="email" className="admin-input" placeholder="paypal@exemple.com" /></label>
      <label className="grid gap-2 text-sm font-bold">Montant<input name="amount" type="number" step="0.01" min="0" required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue="USD" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Debut periode<input name="period_start" type="date" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Fin periode<input name="period_end" type="date" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Motif<select name="purpose" className="admin-input"><option value="partner_revenue_share">Part partenaire 50%</option><option value="bonus">Bonus</option><option value="adjustment">Ajustement</option></select></label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Notes<input name="notes" className="admin-input" /></label>
      <button className="btn-primary justify-self-start md:col-span-3">Generer le paiement PayPal</button>
      {message && <p className="font-bold text-leaf md:col-span-3">{message}</p>}
    </form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Partenaire</th><th className="p-4">PayPal</th><th className="p-4">Periode</th><th className="p-4">Statut</th><th className="p-4 text-right">Montant</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-4">{new Date(row.generated_at).toLocaleDateString("fr-FR")}</td><td className="p-4">{row.dietitian_profiles?.full_name || partners.find(partner => partner.id === row.partner_id)?.full_name || "Partenaire"}</td><td className="p-4">{row.paypal_email}</td><td className="p-4">{[row.period_start, row.period_end].filter(Boolean).join(" - ") || "-"}</td><td className="p-4">{row.status}</td><td className="p-4 text-right font-bold">{Number(row.amount).toLocaleString("fr-FR")} {row.currency}</td></tr>)}</tbody></table></div>
  </div>;
}
