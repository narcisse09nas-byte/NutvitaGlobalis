"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, PPMResource, Timesheet, TimesheetStatus, WBSNode } from "@/lib/ppm/types";
import { wbsLeafNodes } from "@/lib/ppm/wbs";

const statusLabels: Record<TimesheetStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" }, submitted: { fr: "Soumis", en: "Submitted" },
  approved: { fr: "Approuve", en: "Approved" }, rejected: { fr: "Rejete", en: "Rejected" },
};
const statusTones: Record<TimesheetStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", approved: "bg-mint text-forest", rejected: "bg-red-50 text-red-700",
};

export default function TimesheetManager({ projectId, initial, resources, wbsNodes, activities }: {
  projectId: string; initial: Timesheet[]; resources: PPMResource[]; wbsNodes: WBSNode[]; activities: Activity[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = resources.filter(item => item.type === "human" || item.type === "consultant").map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Timesheet | "new" | null>(null);
  const [approving, setApproving] = useState<{ row: Timesheet; status: TimesheetStatus } | null>(null);
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
    const startDate = String(form.get("start_date") || "");
    const endDate = String(form.get("end_date") || "");
    const duration = Number(form.get("duration") || 0);
    const durationUnit = String(form.get("duration_unit") || "hour") as "hour" | "day" | "week" | "month";
    const hours = duration * ({ hour: 1, day: 8, week: 40, month: 173.33 }[durationUnit] || 1);
    const payload = {
      project_id: projectId,
      resource_id: String(form.get("resource_id") || "") || null,
      work_package_id: String(form.get("work_package_id") || "") || null,
      activity_id: String(form.get("activity_id") || "") || null,
      entry_date: startDate,
      week_start: startDate || null,
      end_date: endDate || null,
      duration,
      duration_unit: durationUnit,
      days: durationUnit === "day" ? duration : null,
      hours,
      description: String(form.get("description") || "").trim() || null,
    };
    if (!startDate || !endDate || !duration || new Date(endDate) < new Date(startDate)) { setSaving(false); setMessage(en ? "Valid start/end dates and work duration are required." : "Les dates de debut/fin et une duree de travail valide sont obligatoires."); return; }
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
    if (status === "approved" || status === "rejected") { setApproving({ row, status }); return; }
    const supabase = createClient();
    const result = await supabase.from("ppm_timesheets").update({ status }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as Timesheet : item));
  }

  async function submitApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!approving) return;
    const form = new FormData(event.currentTarget);
    const approvedByName = String(form.get("approved_by_name") || "").trim() || null;
    const supabase = createClient();
    const result = await supabase.from("ppm_timesheets").update({ status: approving.status, approved_by_name: approvedByName, approved_at: new Date().toISOString() }).eq("id", approving.row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === approving.row.id ? result.data as Timesheet : item));
    setApproving(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Timesheets</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New entry" : "Nouvelle saisie"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Resource" : "Ressource"}</th><th className="p-4">{en ? "Period" : "Periode"}</th><th className="p-4">{en ? "Work duration" : "Duree de travail"}</th><th className="p-4">{en ? "Attachment" : "Rattachement"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{resourceLabel(row.resource_id)}</b>{row.description && <p className="mt-1 text-xs text-slate-400">{row.description}</p>}</td>
            <td className="p-4">{new Date(row.week_start || row.entry_date).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")} → {new Date(row.end_date || row.week_start || row.entry_date).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")}</td>
            <td className="p-4">{row.duration != null ? `${row.duration} ${{ hour: en ? "hour(s)" : "heure(s)", day: en ? "day(s)" : "jour(s)", week: en ? "week(s)" : "semaine(s)", month: en ? "month(s)" : "mois" }[row.duration_unit || "hour"]}` : `${row.hours}h`}</td>
            <td className="p-4">{row.work_package_id ? wbsLabel(row.work_package_id) : row.activity_id ? activityLabel(row.activity_id) : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              {row.status === "draft" && <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button>}
              {row.status === "draft" && <button onClick={() => advance(row, "submitted")} className="btn-primary px-3 py-2 text-xs">{en ? "Submit" : "Soumettre"}</button>}
              {row.status === "submitted" && <button onClick={() => advance(row, "approved")} className="btn-primary px-3 py-2 text-xs">{en ? "Approve" : "Approuver"}</button>}
              {row.status === "submitted" && <button onClick={() => advance(row, "rejected")} className="btn-secondary px-3 py-2 text-xs">{en ? "Reject" : "Rejeter"}</button>}
            </div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No timesheet registered." : "Aucun timesheet enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New entry" : "Nouvelle saisie") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Resource" : "Ressource"}<select name="resource_id" defaultValue={editing !== "new" ? editing.resource_id || "" : ""} className="admin-input"><option value="">—</option>{resources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{wbsLeafNodes(wbsNodes).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Activity" : "Activite"}<select name="activity_id" defaultValue={editing !== "new" ? editing.activity_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="start_date" type="date" defaultValue={editing !== "new" ? editing.week_start || editing.entry_date : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="end_date" type="date" defaultValue={editing !== "new" ? editing.end_date || editing.week_start || editing.entry_date : ""} required className="admin-input" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold">{en ? "Work duration" : "Duree de travail"}<input name="duration" type="number" step="0.25" min="0.25" defaultValue={editing !== "new" ? editing.duration ?? editing.days ?? editing.hours : ""} required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">{en ? "Unit" : "Unite"}<select name="duration_unit" defaultValue={editing !== "new" ? editing.duration_unit || (editing.days != null ? "day" : "hour") : "hour"} className="admin-input"><option value="hour">{en ? "Hour" : "Heure"}</option><option value="day">{en ? "Day" : "Jour"}</option><option value="week">{en ? "Week" : "Semaine"}</option><option value="month">{en ? "Month" : "Mois"}</option></select></label></div>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {approving && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitApproval} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{statusLabels[approving.status][locale]} — {resourceLabel(approving.row.resource_id)}</h2><button type="button" onClick={() => setApproving(null)} className="text-2xl">×</button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Name" : "Nom"}<SearchableSelect name="approved_by_name" options={staffOptions} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setApproving(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Confirm" : "Confirmer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
