"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import type { Requirement, RequirementType, ProjectPriority } from "@/lib/ppm/types";

const typeLabels: Record<RequirementType, string> = {
  contractual: "Contractuelle", donor: "Bailleur", technical: "Technique", functional: "Fonctionnelle",
  regulatory: "Reglementaire", quality: "Qualite", reporting: "Reporting", environmental: "Environnementale",
  social: "Sociale", security: "Securite", operational: "Operationnelle",
};
const priorityLabels: Record<ProjectPriority, string> = { low: "Faible", medium: "Moyenne", high: "Elevee", critical: "Critique" };

export default function RequirementsRegister({ projectId, initial }: { projectId: string; initial: Requirement[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Requirement | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // Refinement program, Wave 2: a simple sequential code (REQ-01, REQ-02...) computed from
  // creation order — same "computed, never stored" approach as WBS/Result-Chain codes.
  const requirementCode = (row: Requirement) => {
    const index = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)).findIndex(item => item.id === row.id);
    return `REQ-${String(index + 1).padStart(2, "0")}`;
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      source: String(form.get("source") || "").trim() || null,
      source_stakeholder: String(form.get("source_stakeholder") || "").trim() || null,
      type: String(form.get("type") || "functional") as RequirementType,
      priority: String(form.get("priority") || "medium") as ProjectPriority,
      mandatory: form.get("mandatory") === "on",
      justification: String(form.get("justification") || "").trim() || null,
      acceptance_criteria: String(form.get("acceptance_criteria") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_requirements").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_requirements").update(payload).eq("id", (editing as Requirement).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Requirement, ...current] : current.map(row => row.id === result.data.id ? result.data as Requirement : row));
    setEditing(null);
  }

  return <div className="grid gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Registre des exigences</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle exigence</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Titre</th><th className="p-4">Type</th><th className="p-4">Priorite</th><th className="p-4">Obligatoire</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{requirementCode(row)}</span><b className="text-forest">{row.title}</b>{row.responsible_name && <p className="mt-1 text-xs text-slate-400">Resp. {row.responsible_name}</p>}</td>
            <td className="p-4">{typeLabels[row.type]}</td>
            <td className="p-4">{priorityLabels[row.priority]}</td>
            <td className="p-4">{row.mandatory ? "Oui" : "Non"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucune exigence enregistree.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvelle exigence" : "Modifier l'exigence"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Source<input name="source" defaultValue={editing !== "new" ? editing.source || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Partie prenante source<input name="source_stakeholder" defaultValue={editing !== "new" ? editing.source_stakeholder || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue={editing !== "new" ? editing.type : "functional"} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Priorite<select name="priority" defaultValue={editing !== "new" ? editing.priority : "medium"} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2"><input type="checkbox" name="mandatory" defaultChecked={editing !== "new" ? editing.mandatory : false} className="h-5 w-5" />Obligatoire</label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Justification<textarea name="justification" rows={2} defaultValue={editing !== "new" ? editing.justification || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Critere d&apos;acceptation<textarea name="acceptance_criteria" rows={2} defaultValue={editing !== "new" ? editing.acceptance_criteria || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
