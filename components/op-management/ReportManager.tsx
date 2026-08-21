"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Report, ReportStatus, ReportType } from "@/lib/ppm/types";

const typeLabels: Record<ReportType, string> = {
  weekly: "Hebdomadaire", monthly: "Mensuel", quarterly: "Trimestriel", donor: "Bailleur",
  steering_committee: "Comite de pilotage", final: "Final", custom: "Personnalise",
};
const statusLabels: Record<ReportStatus, string> = { draft: "Brouillon", final: "Final", submitted: "Soumis" };
const statusTones: Record<ReportStatus, string> = { draft: "bg-slate-100 text-slate-600", final: "bg-sky-50 text-sky-800", submitted: "bg-mint text-forest" };

type DraftPrefill = { summary: string; achievements: string; challenges: string; next_steps: string; financial_summary: string; title: string };

export default function ReportManager({ projectId, initial }: { projectId: string; initial: Report[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Report | "new" | null>(null);
  const [draftPrefill, setDraftPrefill] = useState<DraftPrefill | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function closeModal() {
    setEditing(null);
    setDraftPrefill(null);
  }

  async function generateDraft() {
    setGenerating(true);
    setMessage("");
    const response = await fetch("/api/ppm/reports/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
    const payload = await response.json();
    setGenerating(false);
    if (!response.ok) { setMessage(payload.message || "Generation impossible."); return; }
    setDraftPrefill({ ...payload.draft, title: `Rapport IA — ${new Date().toLocaleDateString("fr-FR")}` });
    setEditing("new");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      type: String(form.get("type") || "monthly") as ReportType,
      title: String(form.get("title") || "").trim(),
      period_start: String(form.get("period_start") || "") || null,
      period_end: String(form.get("period_end") || "") || null,
      summary: String(form.get("summary") || "").trim() || null,
      achievements: String(form.get("achievements") || "").trim() || null,
      challenges: String(form.get("challenges") || "").trim() || null,
      next_steps: String(form.get("next_steps") || "").trim() || null,
      financial_summary: String(form.get("financial_summary") || "").trim() || null,
      generated_by_name: String(form.get("generated_by_name") || "").trim() || null,
      status: String(form.get("status") || "draft") as ReportStatus,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_reports").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_reports").update(payload).eq("id", (editing as Report).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Report, ...current] : current.map(row => row.id === result.data.id ? result.data as Report : row));
    closeModal();
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">Rapports</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={generateDraft} disabled={generating} className="btn-secondary px-4 py-2 text-sm">{generating ? "Generation..." : "Generer un brouillon (IA)"}</button>
        <button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau rapport</button>
      </div>
    </div>
    {message && !editing && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{typeLabels[row.type]}{row.period_start ? ` · ${new Date(row.period_start).toLocaleDateString("fr-FR")} → ${row.period_end ? new Date(row.period_end).toLocaleDateString("fr-FR") : "…"}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.summary && <p className="mt-2 text-sm text-slate-600">{row.summary}</p>}
        <button onClick={() => setEditing(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">Modifier</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucun rapport enregistre.</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (draftPrefill ? "Brouillon IA — a relire" : "Nouveau rapport") : "Modifier le rapport"}</h2><button type="button" onClick={closeModal} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        {draftPrefill && <p className="mt-2 rounded-xl bg-sky-50 p-3 text-xs font-bold text-sky-800">Brouillon genere par l&apos;assistant IA a partir des indicateurs du projet. Relisez et corrigez avant d&apos;enregistrer.</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : draftPrefill?.title || ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue={editing !== "new" ? editing.type : "monthly"} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "draft"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Debut periode<input name="period_start" type="date" defaultValue={editing !== "new" ? editing.period_start || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Fin periode<input name="period_end" type="date" defaultValue={editing !== "new" ? editing.period_end || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Resume<textarea name="summary" rows={2} defaultValue={editing !== "new" ? editing.summary || "" : draftPrefill?.summary || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Realisations<textarea name="achievements" rows={2} defaultValue={editing !== "new" ? editing.achievements || "" : draftPrefill?.achievements || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Difficultes rencontrees<textarea name="challenges" rows={2} defaultValue={editing !== "new" ? editing.challenges || "" : draftPrefill?.challenges || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Prochaines etapes<textarea name="next_steps" rows={2} defaultValue={editing !== "new" ? editing.next_steps || "" : draftPrefill?.next_steps || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Resume financier<textarea name="financial_summary" rows={2} defaultValue={editing !== "new" ? editing.financial_summary || "" : draftPrefill?.financial_summary || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Redige par<input name="generated_by_name" defaultValue={editing !== "new" ? editing.generated_by_name || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={closeModal} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
