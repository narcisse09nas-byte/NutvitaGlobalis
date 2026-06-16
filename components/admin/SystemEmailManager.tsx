"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function SystemEmailManager({ templates, logs }: { templates: Row[]; logs: Row[] }) {
  const [rows, setRows] = useState(templates);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"fr" | "en">("fr");

  async function save(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const updates = {
      subject: String(fd.get("subject")),
      body_text: String(fd.get("body_text")),
      subject_en: String(fd.get("subject_en") || ""),
      body_text_en: String(fd.get("body_text_en") || ""),
      active: fd.get("active") === "on",
      updated_at: new Date().toISOString(),
    };
    const { error } = await createClient().from("system_email_templates").update(updates).eq("id", id);
    if (error) setMessage(error.message);
    else {
      setRows(rows.map(row => row.id === id ? { ...row, ...updates } : row));
      setMessage("Modele enregistre.");
    }
  }

  return <div className="grid gap-8">
    {message && <p className="rounded-xl bg-mint p-4">{message}</p>}
    <div className="rounded-full bg-slate-100 p-1 text-sm font-black w-fit"><button onClick={() => setTab("fr")} className={`rounded-full px-4 py-2 ${tab === "fr" ? "bg-forest text-white" : "text-forest"}`}>Francais</button><button onClick={() => setTab("en")} className={`rounded-full px-4 py-2 ${tab === "en" ? "bg-forest text-white" : "text-forest"}`}>English</button></div>
    <div className="grid gap-5">{rows.map(row => <form key={row.id} onSubmit={event => save(event, row.id)} className="grid gap-4 rounded-2xl border bg-white p-6">
      <div><p className="text-xs font-bold uppercase text-leaf">{row.id}</p><h2 className="text-xl font-black">{row.name}</h2></div>
      {tab === "fr" ? <>
        <label className="grid gap-2 text-sm font-bold">Objet<input name="subject" defaultValue={row.subject} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Corps du message<textarea name="body_text" defaultValue={row.body_text} required rows={7} className="admin-input" /></label>
        <input type="hidden" name="subject_en" value={row.subject_en || ""} />
        <input type="hidden" name="body_text_en" value={row.body_text_en || ""} />
      </> : <>
        <input type="hidden" name="subject" value={row.subject || ""} />
        <input type="hidden" name="body_text" value={row.body_text || ""} />
        <label className="grid gap-2 text-sm font-bold">Subject<input name="subject_en" defaultValue={row.subject_en || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Message body<textarea name="body_text_en" defaultValue={row.body_text_en || ""} rows={7} className="admin-input" /></label>
      </>}
      <p className="text-xs text-slate-500">Variables possibles selon le modele : {"{{name}}"}, {"{{total}}"}, {"{{currency}}"}, {"{{start_date}}"}, {"{{end_date}}"}.</p>
      <label className="flex gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={row.active} />Modele actif</label>
      <button className="btn-primary justify-self-start">Enregistrer</button>
    </form>)}</div>
    <section><h2 className="mb-4 text-2xl font-black">Journal des envois</h2><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[700px]"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-4">Date</th><th className="p-4">Destinataire</th><th className="p-4">Objet</th><th className="p-4">Statut</th></tr></thead><tbody>{logs.map(log => <tr key={log.id} className="border-b"><td className="p-4">{new Date(log.created_at).toLocaleString("fr-FR")}</td><td className="p-4">{log.recipient}</td><td className="p-4">{log.subject}</td><td className="p-4 font-bold">{log.status}</td></tr>)}{!logs.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucun email journalise.</td></tr>}</tbody></table></div></section>
  </div>;
}
