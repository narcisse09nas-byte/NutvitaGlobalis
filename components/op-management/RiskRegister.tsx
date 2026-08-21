"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Risk, RiskResponseStrategy, RiskStatus } from "@/lib/ppm/types";

const responseLabels: Record<RiskResponseStrategy, string> = { avoid: "Eviter", mitigate: "Attenuer", transfer: "Transferer", accept: "Accepter" };
const statusLabels: Record<RiskStatus, string> = { open: "Ouvert", monitoring: "Sous surveillance", closed: "Cloture" };

function levelFor(score: number) {
  if (score >= 20) return { label: "Critique", tone: "bg-red-100 text-red-800" };
  if (score >= 12) return { label: "Eleve", tone: "bg-amber-50 text-amber-800" };
  if (score >= 6) return { label: "Modere", tone: "bg-sky-50 text-sky-800" };
  return { label: "Faible", tone: "bg-mint text-forest" };
}

export default function RiskRegister({ projectId, initial }: { projectId: string; initial: Risk[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Risk | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      code: String(form.get("code") || "").trim() || null,
      title: String(form.get("title") || "").trim(),
      category: String(form.get("category") || "").trim() || null,
      cause: String(form.get("cause") || "").trim() || null,
      event: String(form.get("event") || "").trim() || null,
      consequence: String(form.get("consequence") || "").trim() || null,
      probability: Number(form.get("probability") || 3),
      impact: Number(form.get("impact") || 3),
      owner_name: String(form.get("owner_name") || "").trim() || null,
      response_strategy: String(form.get("response_strategy") || "") as RiskResponseStrategy || null,
      mitigation_plan: String(form.get("mitigation_plan") || "").trim() || null,
      deadline: String(form.get("deadline") || "") || null,
      cost: form.get("cost") ? Number(form.get("cost")) : null,
      residual_probability: form.get("residual_probability") ? Number(form.get("residual_probability")) : null,
      residual_impact: form.get("residual_impact") ? Number(form.get("residual_impact")) : null,
      status: String(form.get("status") || "open") as RiskStatus,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_risks").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_risks").update(payload).eq("id", (editing as Risk).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Risk, ...current] : current.map(row => row.id === result.data.id ? result.data as Risk : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Registre des risques</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau risque</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Risque</th><th className="p-4">Categorie</th><th className="p-4">P × I = Score</th><th className="p-4">Niveau</th><th className="p-4">Reponse</th><th className="p-4">Proprietaire</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => { const score = row.probability * row.impact; const level = levelFor(score); return <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.title}</b>{row.code && <span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span>}</td>
            <td className="p-4">{row.category || "—"}</td>
            <td className="p-4">{row.probability} × {row.impact} = {score}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${level.tone}`}>{level.label}</span></td>
            <td className="p-4">{row.response_strategy ? responseLabels[row.response_strategy] : "—"}</td>
            <td className="p-4">{row.owner_name || "—"}</td>
            <td className="p-4">{statusLabels[row.status]}</td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>; })}
          {!rows.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">Aucun risque enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouveau risque" : "Modifier le risque"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Code<input name="code" defaultValue={editing !== "new" ? editing.code || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Categorie<input name="category" defaultValue={editing !== "new" ? editing.category || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Cause<input name="cause" defaultValue={editing !== "new" ? editing.cause || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Evenement<input name="event" defaultValue={editing !== "new" ? editing.event || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Consequence<textarea name="consequence" rows={2} defaultValue={editing !== "new" ? editing.consequence || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Probabilite (1-5)<input name="probability" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.probability : 3} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Impact (1-5)<input name="impact" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.impact : 3} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Proprietaire<input name="owner_name" defaultValue={editing !== "new" ? editing.owner_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Strategie de reponse<select name="response_strategy" defaultValue={editing !== "new" ? editing.response_strategy || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(responseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Plan d&apos;attenuation<textarea name="mitigation_plan" rows={2} defaultValue={editing !== "new" ? editing.mitigation_plan || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Echeance<input name="deadline" type="date" defaultValue={editing !== "new" ? editing.deadline || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Cout<input name="cost" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.cost ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Probabilite residuelle<input name="residual_probability" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.residual_probability ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Impact residuel<input name="residual_impact" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.residual_impact ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "open"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
