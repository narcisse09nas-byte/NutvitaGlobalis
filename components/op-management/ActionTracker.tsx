"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ActionPriority, ActionSourceType, ActionStatus, PPMAction, PPMResource } from "@/lib/ppm/types";

const sourceLabels: Record<ActionSourceType, { fr: string; en: string }> = {
  achievement: { fr: "Realisation", en: "Achievement" }, meeting: { fr: "Reunion", en: "Meeting" }, communication: { fr: "Communication", en: "Communication" }, quality: { fr: "Qualite", en: "Quality" },
  ncr: { fr: "NCR", en: "NCR" }, risk: { fr: "Risque", en: "Risk" }, issue: { fr: "Issue", en: "Issue" }, audit: { fr: "Audit", en: "Audit" }, stakeholder: { fr: "Partie prenante", en: "Stakeholder" },
  management_decision: { fr: "Decision management", en: "Management decision" }, other: { fr: "Autre", en: "Other" },
};
const priorityLabels: Record<ActionPriority, { fr: string; en: string }> = { low: { fr: "Basse", en: "Low" }, medium: { fr: "Moyenne", en: "Medium" }, high: { fr: "Haute", en: "High" }, critical: { fr: "Critique", en: "Critical" } };
const statusLabels: Record<ActionStatus, { fr: string; en: string }> = { open: { fr: "Ouverte", en: "Open" }, in_progress: { fr: "En cours", en: "In progress" }, completed: { fr: "Terminee", en: "Completed" }, verified: { fr: "Verifiee", en: "Verified" }, closed: { fr: "Cloturee", en: "Closed" } };
const statusTones: Record<ActionStatus, string> = {
  open: "bg-slate-100 text-slate-600", in_progress: "bg-sky-50 text-sky-800", completed: "bg-amber-50 text-amber-800",
  verified: "bg-mint text-forest", closed: "bg-slate-200 text-slate-500",
};
const statusSteps: ActionStatus[] = ["open", "in_progress", "completed", "verified", "closed"];

export default function ActionTracker({ projectId, initial, staff = [] }: { projectId: string; initial: PPMAction[]; staff?: PPMResource[] }) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<PPMAction | "new" | null>(null);
  const [validating, setValidating] = useState<PPMAction | null>(null);
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
    if (!payload.description) { setSaving(false); setMessage(en ? "Description is required." : "La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    // Refinement program, Wave 8 (item 45): every action in the central register gets an
    // auto-generated unique registry code, same convention as every other registry this program adds.
    let result;
    if (isNew) {
      const orgCode = await getOrgCodeForProject(supabase, projectId);
      result = await withUniqueRegistryCode<PPMAction>(
        async code => await supabase.from("ppm_actions").insert({ ...payload, code, status: "open", created_by: user?.id }).select("*").single(),
        () => generateRegistryCode(orgCode, "action"),
      );
    } else {
      result = await supabase.from("ppm_actions").update(payload).eq("id", (editing as PPMAction).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as PPMAction, ...current] : current.map(row => row.id === result.data.id ? result.data as PPMAction : row));
    setEditing(null);
  }

  async function advance(row: PPMAction) {
    const index = statusSteps.indexOf(row.status);
    if (index >= statusSteps.length - 1) return;
    const nextStatus = statusSteps[index + 1];
    if (nextStatus === "verified") { setValidating(row); return; }
    const result = await createClient().from("ppm_actions").update({ status: nextStatus }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as PPMAction : item));
  }

  async function submitValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validating) return;
    const form = new FormData(event.currentTarget);
    const validatedByName = String(form.get("validated_by_name") || "").trim() || null;
    const result = await createClient().from("ppm_actions").update({ status: "verified", validated_by_name: validatedByName, validated_at: new Date().toISOString() }).eq("id", validating.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === validating.id ? result.data as PPMAction : item));
    setValidating(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">{en ? "Central action register" : "Registre central des actions"}</h2><p className="text-sm text-slate-500">{filtered.length} action(s)</p></div>
      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input w-auto"><option value="">{en ? "All statuses" : "Tous les statuts"}</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select>
        <button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New action" : "Nouvelle action"}</button>
      </div>
    </div>
    <div className="grid gap-3">
      {filtered.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>{row.code && <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span>}<b className="text-forest">{row.description}</b><p className="mt-1 text-xs text-slate-400">{sourceLabels[row.source_type][locale]}{row.source_label ? ` — ${row.source_label}` : ""} · {priorityLabels[row.priority][locale]}{row.responsible_name ? ` · ${row.responsible_name}` : ""}{isOverdue(row) && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">{en ? "OVERDUE" : "EN RETARD"}</span>}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span>
        </div>
        {row.due_date && <p className="mt-2 text-xs text-slate-500">{en ? "Deadline" : "Echeance"} : {new Date(row.due_date).toLocaleDateString(en ? "en-US" : "fr-FR")}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button>
          {row.status !== "closed" && <button onClick={() => advance(row)} className="btn-primary px-3 py-1.5 text-xs">{statusLabels[statusSteps[statusSteps.indexOf(row.status) + 1]][locale]} →</button>}
        </div>
      </article>)}
      {!filtered.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No action." : "Aucune action."}</p>}
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New action" : "Nouvelle action") : (en ? "Edit action" : "Modifier l'action")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Source" : "Source"}<select name="source_type" defaultValue={editing !== "new" ? editing.source_type : "other"} className="admin-input">{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Source reference" : "Reference source"}<input name="source_label" defaultValue={editing !== "new" ? editing.source_label || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Priority" : "Priorite"}<select name="priority" defaultValue={editing !== "new" ? editing.priority : "medium"} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="due_date" type="date" defaultValue={editing !== "new" ? editing.due_date || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {validating && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitValidation} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Verify" : "Verifier"} — {validating.description}</h2><button type="button" onClick={() => setValidating(null)} className="text-2xl">×</button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Verified by" : "Verifie par"}<SearchableSelect name="validated_by_name" options={staffOptions} allowOther otherLabel={en ? "Verifier name" : "Nom du verificateur"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setValidating(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Confirm" : "Confirmer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
