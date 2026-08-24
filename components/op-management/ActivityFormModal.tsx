"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import PersonPicker from "@/components/op-management/PersonPicker";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, ActivityKind, ActivityStatus, EvMethod, Indicator, KnownPerson, MilestoneWeight, ResultChainNode, WBSNode } from "@/lib/ppm/types";

export const activityStatusLabels: Record<ActivityStatus, { fr: string; en: string }> = {
  not_started: { fr: "Non demarree", en: "Not started" }, in_progress: { fr: "En cours", en: "In progress" }, completed: { fr: "Terminee", en: "Completed" },
  delayed: { fr: "En retard", en: "Delayed" }, blocked: { fr: "Bloquee", en: "Blocked" }, cancelled: { fr: "Annulee", en: "Cancelled" },
};
export const activityStatusTones: Record<ActivityStatus, string> = {
  not_started: "bg-slate-100 text-slate-600", in_progress: "bg-sky-50 text-sky-800", completed: "bg-mint text-forest",
  delayed: "bg-amber-50 text-amber-800", blocked: "bg-red-50 text-red-700", cancelled: "bg-slate-200 text-slate-500",
};
const kindLabels: Record<ActivityKind, { fr: string; en: string }> = {
  activity: { fr: "Activite", en: "Activity" }, sub_activity: { fr: "Sous-activite", en: "Sub-activity" }, task: { fr: "Tache", en: "Task" },
};
const evMethodLabels: Record<EvMethod, { fr: string; en: string }> = {
  "0_100": { fr: "0/100", en: "0/100" }, "50_50": { fr: "50/50", en: "50/50" }, "20_80": { fr: "20/80", en: "20/80" },
  percent_complete: { fr: "Pourcentage physique valide", en: "Validated physical percentage" },
  units_complete: { fr: "Unites completees", en: "Units completed" },
  milestone_weighted: { fr: "Jalons ponderes (Milestone Weighted)", en: "Weighted milestones (Milestone Weighted)" },
};
const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

export type ActivityEditTarget = Activity | "new" | null;

export default function ActivityFormModal({ projectId, target, onClose, onSaved, workPackages, outputs, indicators, activities, knownPeople }: {
  projectId: string; target: ActivityEditTarget; onClose: () => void; onSaved: (row: Activity, isNew: boolean) => void;
  workPackages: WBSNode[]; outputs: ResultChainNode[]; indicators: Indicator[]; activities: Activity[]; knownPeople: KnownPerson[];
}) {
  const { locale, en } = usePpmLocale();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [evMethod, setEvMethod] = useState<EvMethod>(target !== "new" && target ? target.ev_method : "percent_complete");
  const [milestones, setMilestones] = useState<MilestoneWeight[]>(target !== "new" && target ? target.milestone_weights || [] : []);
  const [workPackageId, setWorkPackageId] = useState(target !== "new" && target ? target.work_package_id || "" : "");
  if (!target) return null;
  const isNew = target === "new";
  const activity = isNew ? null : target;
  // Refinement program, Wave 3: "activite parente" only lists activities under the same Work
  // Package — cascading, instead of every activity in the project regardless of family.
  const parentOptions = activities.filter(item => item.id !== activity?.id && (!workPackageId || item.work_package_id === workPackageId));

  function addMilestone() { setMilestones(current => [...current, { label: "", weight: 0, completed: false }]); }
  function updateMilestone(index: number, patch: Partial<MilestoneWeight>) { setMilestones(current => current.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  function removeMilestone(index: number) { setMilestones(current => current.filter((_, i) => i !== index)); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      work_package_id: String(form.get("work_package_id") || "") || null,
      parent_id: String(form.get("parent_id") || "") || null,
      kind: String(form.get("kind") || "activity") as ActivityKind,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      output_id: String(form.get("output_id") || "") || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      responsible_email: String(form.get("responsible_email") || "").trim() || null,
      co_responsible: splitList(String(form.get("co_responsible") || "")),
      location: String(form.get("location") || "").trim() || null,
      target_population: String(form.get("target_population") || "").trim() || null,
      beneficiaries: form.get("beneficiaries") ? Number(form.get("beneficiaries")) : null,
      planned_start: String(form.get("planned_start") || "") || null,
      planned_end: String(form.get("planned_end") || "") || null,
      is_milestone: form.get("is_milestone") === "on",
      planned_budget: form.get("planned_budget") ? Number(form.get("planned_budget")) : null,
      progress_percent: form.get("progress_percent") ? Number(form.get("progress_percent")) : null,
      ev_method: evMethod,
      milestone_weights: evMethod === "milestone_weighted" ? milestones.filter(item => item.label.trim()) : [],
      status: String(form.get("status") || "not_started") as ActivityStatus,
      indicator_id: String(form.get("indicator_id") || "") || null,
      target_value: String(form.get("target_value") || "").trim() || null,
      deliverable: String(form.get("deliverable") || "").trim() || null,
      risk_note: String(form.get("risk_note") || "").trim() || null,
      comment: String(form.get("comment") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = isNew
      ? await supabase.from("ppm_activities").insert({ ...payload, order_index: activities.length, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_activities").update(payload).eq("id", activity!.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    onSaved(result.data as Activity, isNew);
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
    <form onSubmit={submit} className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{isNew ? (en ? "New activity" : "Nouvelle activite") : (en ? "Edit activity" : "Modifier l'activite")}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={activity?.title || ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={activity?.description || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Type<select name="kind" defaultValue={activity?.kind || "activity"} className="admin-input">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" value={workPackageId} onChange={event => setWorkPackageId(event.target.value)} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{workPackages.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Parent activity (optional — filtered by Work Package)" : "Activite parente (facultatif — filtree par Work Package)"}<select name="parent_id" defaultValue={activity?.parent_id || ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{parentOptions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Linked output" : "Output lie"}<select name="output_id" defaultValue={activity?.output_id || ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{outputs.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <PersonPicker knownPeople={knownPeople} nameField="responsible_name" emailField="responsible_email" defaultName={activity?.responsible_name} defaultEmail={activity?.responsible_email} label={en ? "Responsible" : "Responsable"} />
        <label className="grid gap-2 text-sm font-bold">{en ? "Co-responsibles (comma-separated)" : "Co-responsables (separes par des virgules)"}<input name="co_responsible" defaultValue={(activity?.co_responsible || []).join(", ")} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Location" : "Localisation"}<input name="location" defaultValue={activity?.location || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Target population" : "Population cible"}<input name="target_population" defaultValue={activity?.target_population || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Beneficiaries" : "Beneficiaires"}<input name="beneficiaries" type="number" min="0" defaultValue={activity?.beneficiaries ?? ""} className="admin-input" /></label>
        <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="is_milestone" defaultChecked={activity?.is_milestone || false} className="h-5 w-5" />{en ? "Milestone" : "Jalon (milestone)"}</label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Planned start date" : "Date debut prevue"}<input name="planned_start" type="date" defaultValue={activity?.planned_start || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Planned end date" : "Date fin prevue"}<input name="planned_end" type="date" defaultValue={activity?.planned_end || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Planned budget" : "Budget prevu"}<input name="planned_budget" type="number" min="0" step="0.01" defaultValue={activity?.planned_budget ?? ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Progress (%)" : "Progression (%)"}<input name="progress_percent" type="number" min="0" max="100" defaultValue={activity?.progress_percent ?? ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "EV Method (Earned Value)" : "Methode EV (Valeur Acquise)"}<select value={evMethod} onChange={event => setEvMethod(event.target.value as EvMethod)} className="admin-input">{Object.entries(evMethodLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        {evMethod === "milestone_weighted" && <div className="sm:col-span-2">
          <p className="text-sm font-bold">{en ? "Weighted milestones (weights should total 100)" : "Jalons ponderes (le total des poids devrait faire 100)"}</p>
          <div className="mt-2 grid gap-2">
            {milestones.map((milestone, index) => <div key={index} className="grid grid-cols-[1fr_90px_auto_120px_auto] items-center gap-2">
              <input placeholder={en ? "Milestone (e.g. ToR)" : "Jalon (ex: TDR)"} value={milestone.label} onChange={event => updateMilestone(index, { label: event.target.value })} className="admin-input" />
              <input type="number" min="0" max="100" placeholder={en ? "Weight %" : "Poids %"} value={milestone.weight} onChange={event => updateMilestone(index, { weight: Number(event.target.value) })} className="admin-input" />
              <label className="flex items-center gap-1 text-xs font-bold"><input type="checkbox" checked={milestone.completed} onChange={event => updateMilestone(index, { completed: event.target.checked })} className="h-4 w-4" />{en ? "Done" : "Fait"}</label>
              <input type="date" value={milestone.completed_date || ""} onChange={event => updateMilestone(index, { completed_date: event.target.value })} className="admin-input" />
              <button type="button" onClick={() => removeMilestone(index)} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-5 text-red-600" /></button>
            </div>)}
            <button type="button" onClick={addMilestone} className="btn-secondary w-fit px-3 py-1.5 text-xs"><PlusIcon className="mr-1 h-4" />{en ? "Add a milestone" : "Ajouter un jalon"}</button>
          </div>
        </div>}
        <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={activity?.status || "not_started"} className="admin-input">{Object.entries(activityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Indicator" : "Indicateur"}<select name="indicator_id" defaultValue={activity?.indicator_id || ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{indicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Target" : "Cible"}<input name="target_value" defaultValue={activity?.target_value || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Deliverable" : "Livrable"}<input name="deliverable" defaultValue={activity?.deliverable || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Risk" : "Risque"}<input name="risk_note" defaultValue={activity?.risk_note || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Comment" : "Commentaire"}<textarea name="comment" rows={2} defaultValue={activity?.comment || ""} className="admin-input" /></label>
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 sm:col-span-2">{en ? <>Actual dates, delay and corrective action are now reported via <b>Report an achievement</b> — this planning form only covers what is planned.</> : <>Dates reelles, retard et action corrective se rapportent desormais via <b>Rapporter une realisation</b> — ce formulaire de planification ne couvre que le prevu.</>}</p>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
      </div>
    </form>
  </div>;
}
