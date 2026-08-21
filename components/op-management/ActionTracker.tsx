"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { ActionPriority, ActionSourceType, ActionStatus, PPMAction } from "@/lib/ppm/types";

const sourceLabels: Record<ActionSourceType, string> = {
  achievement: "Realisation", meeting: "Reunion", communication: "Communication", quality: "Qualite",
  ncr: "NCR", risk: "Risque", issue: "Issue", audit: "Audit", stakeholder: "Partie prenante",
  management_decision: "Decision management", other: "Autre",
};
const priorityLabels: Record<ActionPriority, string> = { low: "Basse", medium: "Moyenne", high: "Haute", critical: "Critique" };
const statusLabels: Record<ActionStatus, string> = { open: "Ouverte", in_progress: "En cours", completed: "Terminee", verified: "Verifiee", closed: "Cloturee" };
const statusTones: Record<ActionStatus, string> = {
  open: "bg-slate-100 text-slate-600", in_progress: "bg-sky-50 text-sky-800", completed: "bg-amber-50 text-amber-800",
  verified: "bg-mint text-forest", closed: "bg-slate-200 text-slate-500",
};
const statusSteps: ActionStatus[] = ["open", "in_progress", "completed", "verified", "closed"];

export default function ActionTracker({ projectId, initial }: { projectId: string; initial: PPMAction[] }) {
  const [rows, setRows] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<PPMAction | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = statusFilter ? rows.filter(row => row.status === statusFilter) : rows;
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (row: PPMAction) => !!row.due_date && row.due_date < today && row.status !== "completed" && row.status !== "verified" && row.status !== "closed";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      source_type: String(form.get("source_type") || "other") as ActionSourceType,
      source_label: String(form.get("source_label") || "").trim() || null,
      description: String(form.get("description") || "").trim(),
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      priority: String(form.get("priority") || "medium") as ActionPriority,
      due_date: String(form.get("due_date") || "") || null,
    };
    if (!payload.description) { setSaving(false); setMessage("La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_actions").insert({ ...payload, status: "open", created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_actions").update(payload).eq("id", (editing as PPMAction).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as PPMAction, ...current] : current.map(row => row.id === result.data.id ? result.data as PPMAction : row));
    setEditing(null);
  }

  async function advance(row: PPMAction) {
    const index = statusSteps.indexOf(row.status);
    if (index >= statusSteps.length - 1) return;
    const nextStatus = statusSteps[index + 1];
    const extra: Record<string, unknown> = {};
    if (nextStatus === "verified") { extra.validated_by_name = prompt("Verifie par :") || null; extra.validated_at = new Date().toISOString(); }
    const result = await createClient().from("ppm_actions").update({ status: nextStatus, ...extra }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as PPMAction : item));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">Registre central des actions</h2><p className="text-sm text-slate-500">{filtered.length} action(s)</p></div>
      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input w-auto"><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle action</button>
      </div>
    </div>
    <div className="grid gap-3">
      {filtered.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.description}</b><p className="mt-1 text-xs text-slate-400">{sourceLabels[row.source_type]}{row.source_label ? ` — ${row.source_label}` : ""} · {priorityLabels[row.priority]}{row.responsible_name ? ` · ${row.responsible_name}` : ""}{isOverdue(row) && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">EN RETARD</span>}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.due_date && <p className="mt-2 text-xs text-slate-500">Echeance : {new Date(row.due_date).toLocaleDateString("fr-FR")}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-1.5 text-xs">Modifier</button>
          {row.status !== "closed" && <button onClick={() => advance(row)} className="btn-primary px-3 py-1.5 text-xs">{statusLabels[statusSteps[statusSteps.indexOf(row.status) + 1]]} →</button>}
        </div>
      </article>)}
      {!filtered.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune action.</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? "Nouvelle action" : "Modifier l'action"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Source<select name="source_type" defaultValue={editing !== "new" ? editing.source_type : "other"} className="admin-input">{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Reference source<input name="source_label" defaultValue={editing !== "new" ? editing.source_label || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Priorite<select name="priority" defaultValue={editing !== "new" ? editing.priority : "medium"} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Echeance<input name="due_date" type="date" defaultValue={editing !== "new" ? editing.due_date || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
