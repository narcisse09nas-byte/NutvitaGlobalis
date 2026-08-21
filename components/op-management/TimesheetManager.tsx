"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Activity, PPMResource, Timesheet, TimesheetStatus, WBSNode } from "@/lib/ppm/types";

const statusLabels: Record<TimesheetStatus, string> = { draft: "Brouillon", submitted: "Soumis", approved: "Approuve", rejected: "Rejete" };
const statusTones: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", approved: "bg-mint text-forest", rejected: "bg-red-50 text-red-700",
};

export default function TimesheetManager({ projectId, initial, resources, wbsNodes, activities }: {
  projectId: string; initial: Timesheet[]; resources: PPMResource[]; wbsNodes: WBSNode[]; activities: Activity[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Timesheet | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const resourceLabel = (id?: string | null) => resources.find(item => item.id === id)?.name || "—";
  const wbsLabel = (id?: string | null) => wbsNodes.find(item => item.id === id)?.title || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      resource_id: String(form.get("resource_id") || "") || null,
      work_package_id: String(form.get("work_package_id") || "") || null,
      activity_id: String(form.get("activity_id") || "") || null,
      entry_date: String(form.get("entry_date") || ""),
      hours: Number(form.get("hours") || 0),
      description: String(form.get("description") || "").trim() || null,
    };
    if (!payload.entry_date || !payload.hours) { setSaving(false); setMessage("La date et le nombre d'heures sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_timesheets").insert({ ...payload, status: "draft", created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_timesheets").update(payload).eq("id", (editing as Timesheet).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Timesheet, ...current] : current.map(row => row.id === result.data.id ? result.data as Timesheet : row));
    setEditing(null);
  }

  async function advance(row: Timesheet, status: TimesheetStatus) {
    const supabase = createClient();
    const extra = status === "approved" || status === "rejected" ? { approved_by_name: prompt("Nom :") || null, approved_at: new Date().toISOString() } : {};
    const result = await supabase.from("ppm_timesheets").update({ status, ...extra }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as Timesheet : item));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Timesheets</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle saisie</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Ressource</th><th className="p-4">Date</th><th className="p-4">Heures</th><th className="p-4">Rattachement</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{resourceLabel(row.resource_id)}</b>{row.description && <p className="mt-1 text-xs text-slate-400">{row.description}</p>}</td>
            <td className="p-4">{new Date(row.entry_date).toLocaleDateString("fr-FR")}</td>
            <td className="p-4">{row.hours}h</td>
            <td className="p-4">{row.work_package_id ? wbsLabel(row.work_package_id) : row.activity_id ? activityLabel(row.activity_id) : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              {row.status === "draft" && <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button>}
              {row.status === "draft" && <button onClick={() => advance(row, "submitted")} className="btn-primary px-3 py-2 text-xs">Soumettre</button>}
              {row.status === "submitted" && <button onClick={() => advance(row, "approved")} className="btn-primary px-3 py-2 text-xs">Approuver</button>}
              {row.status === "submitted" && <button onClick={() => advance(row, "rejected")} className="btn-secondary px-3 py-2 text-xs">Rejeter</button>}
            </div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucun timesheet enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? "Nouvelle saisie" : "Modifier"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Ressource<select name="resource_id" defaultValue={editing !== "new" ? editing.resource_id || "" : ""} className="admin-input"><option value="">—</option>{resources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">Aucun</option>{wbsNodes.filter(node => node.level === 4).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Activite<select name="activity_id" defaultValue={editing !== "new" ? editing.activity_id || "" : ""} className="admin-input"><option value="">Aucune</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Date<input name="entry_date" type="date" defaultValue={editing !== "new" ? editing.entry_date : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Heures<input name="hours" type="number" step="0.25" min="0" defaultValue={editing !== "new" ? editing.hours : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
