"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasLocalAdminMode } from "@/lib/supabase/config";

type Row = Record<string, any>;

const statusFor = (row: Row) => {
  const expires = row.partner_access_expires_at ? new Date(row.partner_access_expires_at) : null;
  return expires && expires >= new Date() ? "actif" : "inactif";
};

export default function PartnerClientManager({ initial, partnerId }: { initial: Row[]; partnerId: string }) {
  const [rows, setRows] = useState(initial);
  const [credentials, setCredentials] = useState<Row | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [extensionFor, setExtensionFor] = useState<Row | null>(null);
  const sortedRows = useMemo(() => [...rows].sort((a, b) => Number(statusFor(b) === "actif") - Number(statusFor(a) === "actif")), [rows]);

  async function uploadReceipt(file: File | null, clientHint: string) {
    if (!file) return null;
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${partnerId}/${clientHint || crypto.randomUUID()}/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("partner-receipts").upload(path, file);
    if (error) throw error;
    return path;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const form = e.currentTarget, fd = new FormData(form);
    try {
      const receiptPath = await uploadReceipt((fd.get("receipt") as File) || null, String(fd.get("username") || fd.get("full_name") || ""));
      const payload = Object.fromEntries(fd);
      delete payload.receipt;
      const response = await fetch("/api/partner/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, receipt_path: receiptPath }) });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message);
        setLoading(false);
        return;
      }
      if (hasLocalAdminMode()) await createClient().from("client_profiles").insert({ ...result.client, created_by_partner_id: partnerId, assigned_partner_id: partnerId });
      setRows([{ ...result.client, latest_payment: result.payment }, ...rows]);
      setCredentials({ username: result.client.username, password: result.password, client_number: result.client.client_number, id: result.client.id, full_name: result.client.full_name });
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recu impossible a joindre.");
    }
    setLoading(false);
  }

  async function extend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!extensionFor) return;
    setMessage("");
    const form = e.currentTarget, fd = new FormData(form);
    try {
      const receiptPath = await uploadReceipt((fd.get("receipt") as File) || null, extensionFor.username || extensionFor.id);
      const payload = Object.fromEntries(fd);
      delete payload.receipt;
      const response = await fetch("/api/partner/client-extension", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, client_id: extensionFor.id, receipt_path: receiptPath }) });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message);
        return;
      }
      setRows(rows.map(row => row.id === extensionFor.id ? { ...row, partner_access_expires_at: result.expires_at, partner_assignment_status: "active" } : row));
      setExtensionFor(null);
      setMessage("Extension enregistree.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Extension impossible.");
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <h2 className="text-xl font-black md:col-span-2">Creer un client recu sur site</h2>
        <label className="grid gap-2 text-sm font-bold">Nom complet<input name="full_name" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Nom d'utilisateur souhaite<input name="username" className="admin-input" placeholder="Ex. marie.ngono" /></label>
        <label className="grid gap-2 text-sm font-bold">Email facultatif<input name="email" type="email" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Telephone<input name="phone" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Pays<input name="country" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Ville<input name="city" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Montant<input name="amount" type="number" min="0" defaultValue="15000" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Paiement<select name="payment_status" className="admin-input"><option value="paid">Paye</option><option value="partial">Partiel</option><option value="unpaid">Non paye</option><option value="waived">Gratuit / exonere</option></select></label>
        <label className="grid gap-2 text-sm font-bold">Moyen de paiement<select name="payment_method" className="admin-input"><option value="cash">Especes</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Virement</option><option value="card">Carte</option></select></label>
        <label className="grid gap-2 text-sm font-bold">Periode couverte<input name="period_months" type="number" min="1" defaultValue="3" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">Recu de paiement<input name="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">Mot de passe temporaire facultatif<input name="password" type="text" minLength={8} className="admin-input" placeholder="Genere automatiquement si vide" /></label>
        <button disabled={loading} className="btn-primary justify-self-start md:col-span-2">{loading ? "Creation..." : "Creer le client et ses acces"}</button>
        {message && <p className="text-sm font-bold text-leaf md:col-span-2">{message}</p>}
      </form>

      {credentials && <section className="rounded-2xl bg-forest p-6 text-white"><h2 className="text-xl font-black text-white">Acces a remettre au client</h2><div className="mt-4 grid gap-2 text-sm"><p>Numero client : <b>{credentials.client_number}</b></p><p>Nom d'utilisateur : <b>{credentials.username}</b></p><p>Mot de passe temporaire : <b>{credentials.password}</b></p></div><p className="mt-4 text-sm text-white/70">Le client devra modifier son mot de passe apres sa premiere connexion.</p><Link href={`/partenaire/clients/${credentials.id}/carte?name=${encodeURIComponent(credentials.full_name)}&username=${encodeURIComponent(credentials.username)}&number=${encodeURIComponent(credentials.client_number)}`} className="btn-primary mt-5" target="_blank">Afficher la carte QR</Link></section>}

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-black">Mes clients</h2>
        <div className="mt-4 grid gap-3">
          {sortedRows.map(row => {
            const active = statusFor(row) === "actif";
            return <div key={row.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><b>{row.full_name}</b><p className="text-xs text-slate-500">{row.client_number || "Numero a generer"} - {row.username || row.email || "Sans identifiant affiche"}</p><p className="mt-1 text-xs text-slate-500">{[row.phone || row.whatsapp_phone, row.city, row.country].filter(Boolean).join(" - ") || "Coordonnees incompletes"}</p><p className="mt-1 text-xs text-slate-500">Expire le : {row.partner_access_expires_at ? new Date(row.partner_access_expires_at).toLocaleDateString("fr-FR") : "non defini"}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-mint text-leaf" : "bg-rose-50 text-rose-700"}`}>{active ? "Actif" : "Inactif"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
                <Link href={`/partenaire/clients/${row.id}/carte?name=${encodeURIComponent(row.full_name)}&username=${encodeURIComponent(row.username || "client.demo")}&number=${encodeURIComponent(row.client_number || "NVG-C-0001")}`} className="text-leaf">Carte QR</Link>
                <button onClick={() => setExtensionFor(row)} className="text-orange">Prolonger l'acces</button>
              </div>
            </div>;
          })}
          {!rows.length && <p className="text-slate-400">Aucun client cree directement ou attribue.</p>}
        </div>
      </section>

      {extensionFor && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4"><form onSubmit={extend} className="mx-auto my-10 grid max-w-xl gap-4 rounded-3xl bg-white p-7 md:grid-cols-2"><div className="md:col-span-2 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">Prolonger {extensionFor.full_name}</h2><p className="mt-1 text-sm text-slate-500">Le nouveau paiement prolonge la periode active.</p></div><button type="button" onClick={() => setExtensionFor(null)} className="text-3xl leading-none">x</button></div><label className="grid gap-2 text-sm font-bold">Montant<input name="amount" type="number" min="0" defaultValue="15000" className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Paiement<select name="payment_status" className="admin-input"><option value="paid">Paye</option><option value="partial">Partiel</option><option value="waived">Gratuit / exonere</option></select></label><label className="grid gap-2 text-sm font-bold">Moyen<select name="payment_method" className="admin-input"><option value="cash">Especes</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Virement</option><option value="card">Carte</option></select></label><label className="grid gap-2 text-sm font-bold">Mois ajoutes<input name="period_months" type="number" min="1" defaultValue="3" className="admin-input" /></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Recu<input name="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" className="admin-input" /></label><button className="btn-primary justify-self-start md:col-span-2">Enregistrer l'extension</button></form></div>}
    </div>
  );
}
