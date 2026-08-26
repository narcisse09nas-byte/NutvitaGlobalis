"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, Issue, IssueStatus, PPMResource, ProjectPriority, Stakeholder, WBSNode } from "@/lib/ppm/types";

const statusLabels: Record<IssueStatus, { fr: string; en: string }> = { open: { fr: "Ouvert", en: "Open" }, in_progress: { fr: "En cours", en: "In progress" }, resolved: { fr: "Resolu", en: "Resolved" }, closed: { fr: "Cloture", en: "Closed" } };
const statusTones: Record<IssueStatus, string> = {
  open: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-800",
  resolved: "bg-mint text-forest", closed: "bg-slate-100 text-slate-600",
};
const priorityLabels: Record<ProjectPriority, { fr: string; en: string }> = { low: { fr: "Basse", en: "Low" }, medium: { fr: "Moyenne", en: "Medium" }, high: { fr: "Haute", en: "High" }, critical: { fr: "Critique", en: "Critical" } };

export default function IssueManager({ projectId, initial, wbsNodes, activities, staff = [], stakeholders = [] }: {
  projectId: string; initial: Issue[]; wbsNodes: WBSNode[]; activities: Activity[]; staff?: PPMResource[]; stakeholders?: Stakeholder[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const raisedByOptions = [
    ...staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title ? `${item.role_title} (Staff)` : "Staff" })),
    ...stakeholders.map(item => ({ value: item.name, label: item.name, hint: en ? "Stakeholder" : "Partie prenante" })),
  ];
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Issue | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const wbsLabel = (id?: string | null) => wbsNodes.find(item => item.id === id)?.title || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      work_package_id: String(form.get("work_package_id") || "") || null,
      activity_id: String(form.get("activity_id") || "") || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      category: String(form.get("category") || "").trim() || null,
      raised_by_name: String(form.get("raised_by_name") || "").trim() || null,
      priority: String(form.get("priority") || "medium") as ProjectPriority,
      owner_name: String(form.get("owner_name") || "").trim() || null,
      resolution_plan: String(form.get("resolution_plan") || "").trim() || null,
      due_date: String(form.get("due_date") || "") || null,
      status: String(form.get("status") || "open") as IssueStatus,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_issues").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_issues").update(payload).eq("id", (editing as Issue).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Issue, ...current] : current.map(row => row.id === result.data.id ? result.data as Issue : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Issue register" : "Registre des issues"}</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New issue" : "Nouvelle issue"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Issue</th><th className="p-4">{en ? "Linked to" : "Rattachement"}</th><th className="p-4">{en ? "Priority" : "Priorite"}</th><th className="p-4">{en ? "Owner" : "Proprietaire"}</th><th className="p-4">{en ? "Deadline" : "Echeance"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.title}</b>{row.category && <p className="mt-1 text-xs text-slate-400">{row.category}</p>}</td>
            <td className="p-4">{row.work_package_id ? wbsLabel(row.work_package_id) : row.activity_id ? activityLabel(row.activity_id) : "—"}</td>
            <td className="p-4">{priorityLabels[row.priority][locale]}</td>
            <td className="p-4">{row.owner_name || "—"}</td>
            <td className="p-4">{row.due_date ? new Date(row.due_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span></td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No issue recorded." : "Aucune issue enregistree."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New issue" : "Nouvelle issue") : (en ? "Edit issue" : "Modifier l'issue")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Activity" : "Activite"}<select name="activity_id" defaultValue={editing !== "new" ? editing.activity_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<input name="category" defaultValue={editing !== "new" ? editing.category || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Raised by" : "Signale par"}<SearchableSelect name="raised_by_name" options={raisedByOptions} defaultValue={editing !== "new" ? editing.raised_by_name || "" : ""} allowOther otherLabel={en ? "Name (staff or stakeholder)" : "Nom (staff ou partie prenante)"} placeholder={en ? "Select..." : "Selectionner..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Priority" : "Priorite"}<select name="priority" defaultValue={editing !== "new" ? editing.priority : "medium"} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Owner" : "Proprietaire"}<SearchableSelect name="owner_name" options={staffOptions} defaultValue={editing !== "new" ? editing.owner_name || "" : ""} allowOther otherLabel={en ? "Owner name" : "Nom du proprietaire"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Resolution plan" : "Plan de resolution"}<textarea name="resolution_plan" rows={2} defaultValue={editing !== "new" ? editing.resolution_plan || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="due_date" type="date" defaultValue={editing !== "new" ? editing.due_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "open"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
