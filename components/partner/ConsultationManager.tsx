"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function ConsultationManager({ initial, clients, partnerId }: { initial: Row[]; clients: Row[]; partnerId: string }) {
  const [rows, setRows] = useState(initial), [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, payload = Object.fromEntries(new FormData(form));
    const client = clients.find(x => x.id === payload.client_id);
    const entry = { ...payload, partner_id: partnerId, amount: 0, scheduled_at: payload.scheduled_at ? new Date(String(payload.scheduled_at)).toISOString() : new Date().toISOString(), status: "planned", payment_status: "waived", client_profiles: client };
    const { data, error } = await createClient().from("partner_consultations").insert(entry).select().single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setRows([data, ...rows]);
    form.reset();
    setMessage("Consultation creee.");
  }

  async function complete(row: Row) {
    const { error } = await createClient().from("partner_consultations").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", row.id);
    if (!error) setRows(rows.map(x => x.id === row.id ? { ...x, status: "completed" } : x));
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <h2 className="text-xl font-black md:col-span-2">Nouvelle consultation</h2>
        <label className="grid gap-2 text-sm font-bold">Client actif<select name="client_id" required className="admin-input"><option value="">Selectionner</option>{clients.map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.username || c.email || c.client_number}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Date et heure<input name="scheduled_at" type="datetime-local" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Origine<select name="source" className="admin-input"><option value="onsite">Site physique</option><option value="online">En ligne</option><option value="partner_direct">Initiee directement</option><option value="home_visit">Visite a domicile</option></select></label>
        <label className="grid gap-2 text-sm font-bold">Motif<input name="reason" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">Objectifs<textarea name="objectives" rows={3} className="admin-input" /></label>
        <button className="btn-primary justify-self-start md:col-span-2">Creer la consultation</button>
        {message && <p className="text-sm font-bold text-leaf md:col-span-2">{message}</p>}
      </form>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-black">Historique des consultations</h2>
        <div className="mt-4 grid gap-3">{rows.map(row => <article key={row.id} className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap justify-between gap-3"><div><b>{row.client_profiles?.full_name || "Client"} - {row.reason}</b><p className="mt-1 text-sm text-slate-500">{new Date(row.scheduled_at).toLocaleString("fr-FR")} - {row.source}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{row.status}</span></div>{row.status !== "completed" && <button onClick={() => complete(row)} className="mt-3 text-sm font-bold text-leaf">Marquer terminee</button>}</article>)}{!rows.length && <p className="text-slate-400">Aucune consultation.</p>}</div>
      </section>
    </div>
  );
}
