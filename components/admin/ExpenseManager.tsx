"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

const categories = [
  ["domain", "Nom de domaine"],
  ["email_accounts", "Comptes emails"],
  ["hosting", "Hebergement"],
  ["software", "Logiciels"],
  ["marketing", "Marketing"],
  ["operations", "Operations"],
  ["legal", "Juridique"],
  ["other", "Autre"],
];

export default function ExpenseManager({ initial, adminId }: { initial: Row[]; adminId: string }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const payload = { expense_date: String(fd.get("expense_date")), category: String(fd.get("category")), vendor: String(fd.get("vendor") || ""), description: String(fd.get("description")), amount: Number(fd.get("amount") || 0), currency: String(fd.get("currency") || "USD"), payment_method: String(fd.get("payment_method") || "manual"), reference: String(fd.get("reference") || ""), receipt_url: String(fd.get("receipt_url") || ""), status: String(fd.get("status") || "paid"), created_by: adminId };
    const { data, error } = await createClient().from("business_expenses").insert(payload).select("*").single();
    if (error) setMessage(error.message);
    else {
      setRows([data, ...rows]);
      setMessage("Depense enregistree.");
      form.reset();
    }
  }

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return <div className="grid gap-6">
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-4">
      <h2 className="text-xl font-black md:col-span-4">Nouvelle depense</h2>
      <label className="grid gap-2 text-sm font-bold">Date<input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Categorie<select name="category" className="admin-input">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Fournisseur<input name="vendor" className="admin-input" placeholder="Ex. Namecheap, Google Workspace" /></label>
      <label className="grid gap-2 text-sm font-bold">Statut<select name="status" className="admin-input"><option value="paid">Payee</option><option value="pending">En attente</option><option value="planned">Planifiee</option><option value="cancelled">Annulee</option></select></label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Description<input name="description" required className="admin-input" placeholder="Achat domaine, comptes emails, abonnement outil..." /></label>
      <label className="grid gap-2 text-sm font-bold">Montant<input name="amount" type="number" min="0" step="0.01" required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue="USD" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Methode<input name="payment_method" className="admin-input" placeholder="Carte, PayPal, mobile money..." /></label>
      <label className="grid gap-2 text-sm font-bold">Reference<input name="reference" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Recu / lien document<input name="receipt_url" type="url" className="admin-input" /></label>
      <button className="btn-primary justify-self-start md:col-span-4">Enregistrer la depense</button>
      {message && <p className="font-bold text-leaf md:col-span-4">{message}</p>}
    </form>
    <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Total enregistre</h2><p className="mt-2 text-3xl font-black text-forest">{total.toLocaleString("fr-FR")} USD</p></section>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Categorie</th><th className="p-4">Fournisseur</th><th className="p-4">Description</th><th className="p-4">Statut</th><th className="p-4 text-right">Montant</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-4">{new Date(row.expense_date).toLocaleDateString("fr-FR")}</td><td className="p-4">{categories.find(([value]) => value === row.category)?.[1] || row.category}</td><td className="p-4">{row.vendor || "-"}</td><td className="p-4">{row.description}</td><td className="p-4">{row.status}</td><td className="p-4 text-right font-bold">{Number(row.amount).toLocaleString("fr-FR")} {row.currency}</td></tr>)}</tbody></table></div>
  </div>;
}
