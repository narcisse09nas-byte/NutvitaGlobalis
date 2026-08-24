"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMResource, Stakeholder, StakeholderInteraction, StakeholderLevel, StakeholderPosition } from "@/lib/ppm/types";

const levelLabels: Record<StakeholderLevel, { fr: string; en: string }> = { low: { fr: "Faible", en: "Low" }, medium: { fr: "Moyen", en: "Medium" }, high: { fr: "Eleve", en: "High" } };
const positionLabels: Record<StakeholderPosition, { fr: string; en: string }> = { champion: { fr: "Champion", en: "Champion" }, supporter: { fr: "Soutien", en: "Supporter" }, neutral: { fr: "Neutre", en: "Neutral" }, critic: { fr: "Critique", en: "Critic" }, blocker: { fr: "Bloquant", en: "Blocker" } };

export default function StakeholderInteractionManager({ projectId, initial, stakeholders, staff = [] }: {
  projectId: string; initial: StakeholderInteraction[]; stakeholders: Stakeholder[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<StakeholderInteraction | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const stakeholderLabel = (id: string) => stakeholders.find(item => item.id === id)?.name || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const proposedPosition = String(form.get("proposed_position") || "") as StakeholderPosition;
    const payload = {
      project_id: projectId,
      stakeholder_id: String(form.get("stakeholder_id") || ""),
      interaction_date: String(form.get("interaction_date") || "") || null,
      interaction_type: String(form.get("interaction_type") || "").trim() || null,
      participants: String(form.get("participants") || "").trim() || null,
      objective: String(form.get("objective") || "").trim() || null,
      topics_discussed: String(form.get("topics_discussed") || "").trim() || null,
      concerns: String(form.get("concerns") || "").trim() || null,
      expectations: String(form.get("expectations") || "").trim() || null,
      engagement_observed: String(form.get("engagement_observed") || "").trim() || null,
      decisions: String(form.get("decisions") || "").trim() || null,
      actions: String(form.get("actions") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      deadline: String(form.get("deadline") || "") || null,
      proposed_position: proposedPosition || null,
      proposed_influence_level: String(form.get("proposed_influence_level") || "") as StakeholderLevel || null,
      proposed_interest_level: String(form.get("proposed_interest_level") || "") as StakeholderLevel || null,
      position_change_status: proposedPosition ? "proposed" : "not_proposed",
    };
    if (!payload.stakeholder_id) { setSaving(false); setMessage(en ? "The stakeholder is required." : "La partie prenante est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_stakeholder_interactions").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_stakeholder_interactions").update(payload).eq("id", (editing as StakeholderInteraction).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as StakeholderInteraction, ...current] : current.map(row => row.id === result.data.id ? result.data as StakeholderInteraction : row));
    setEditing(null);
  }

  async function decidePositionChange(row: StakeholderInteraction, approve: boolean) {
    const supabase = createClient();
    const result = await supabase.from("ppm_stakeholder_interactions").update({ position_change_status: approve ? "approved" : "rejected" }).eq("id", row.id).select("*").single();
    if (result.error) return;
    setRows(current => current.map(item => item.id === row.id ? result.data as StakeholderInteraction : item));
    if (approve && row.proposed_position) {
      await supabase.from("ppm_stakeholders").update({
        position: row.proposed_position,
        influence_level: row.proposed_influence_level || undefined,
        interest_level: row.proposed_interest_level || undefined,
      }).eq("id", row.stakeholder_id);
    }
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Stakeholder interactions" : "Interactions avec les parties prenantes"}</h2>
      <button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "Record an interaction" : "Enregistrer une interaction"}</button>
    </div>
    {/* Refinement program, Wave 7 (item 39): the button used to be silently disabled with no
        explanation when no Stakeholder existed yet — indistinguishable from "broken." */}
    {!stakeholders.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "First add a stakeholder (Team or Stakeholders tab) to be able to record an interaction." : "Ajoutez d'abord une partie prenante (onglet Equipe ou Parties prenantes) pour pouvoir enregistrer une interaction."}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{stakeholderLabel(row.stakeholder_id)}</b><p className="mt-1 text-xs text-slate-400">{row.interaction_type}{row.interaction_date ? ` · ${new Date(row.interaction_date).toLocaleDateString(en ? "en-US" : "fr-FR")}` : ""}</p></div>
          {row.proposed_position && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{en ? "Proposed position" : "Position proposee"} : {positionLabels[row.proposed_position][locale]} ({row.position_change_status})</span>}
        </div>
        {row.engagement_observed && <p className="mt-2 text-sm text-slate-600"><b>{en ? "Observed engagement:" : "Engagement observe :"}</b> {row.engagement_observed}</p>}
        {row.concerns && <p className="mt-2 text-sm text-slate-600"><b>{en ? "Concerns:" : "Preoccupations :"}</b> {row.concerns}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button>
          {row.position_change_status === "proposed" && <>
            <button onClick={() => decidePositionChange(row, true)} className="btn-primary px-3 py-1.5 text-xs">{en ? "Approve the change" : "Approuver le changement"}</button>
            <button onClick={() => decidePositionChange(row, false)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Reject" : "Rejeter"}</button>
          </>}
        </div>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No interaction recorded." : "Aucune interaction enregistree."}</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "Record an interaction" : "Enregistrer une interaction") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Stakeholder" : "Partie prenante"}<select name="stakeholder_id" defaultValue={editing !== "new" ? editing.stakeholder_id : ""} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{stakeholders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Date" : "Date"}<input name="interaction_date" type="date" defaultValue={editing !== "new" ? editing.interaction_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Interaction type" : "Type d'interaction"}<input name="interaction_type" defaultValue={editing !== "new" ? editing.interaction_type || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Participants" : "Participants"}<input name="participants" defaultValue={editing !== "new" ? editing.participants || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Objective" : "Objectif"}<input name="objective" defaultValue={editing !== "new" ? editing.objective || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Topics discussed" : "Sujets discutes"}<textarea name="topics_discussed" rows={2} defaultValue={editing !== "new" ? editing.topics_discussed || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Concerns" : "Preoccupations"}<textarea name="concerns" rows={2} defaultValue={editing !== "new" ? editing.concerns || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Expectations expressed" : "Attentes exprimees"}<textarea name="expectations" rows={2} defaultValue={editing !== "new" ? editing.expectations || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Observed engagement" : "Engagement observe"}<textarea name="engagement_observed" rows={2} defaultValue={editing !== "new" ? editing.engagement_observed || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Decisions" : "Decisions"}<textarea name="decisions" rows={2} defaultValue={editing !== "new" ? editing.decisions || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Actions" : "Actions"}<textarea name="actions" rows={2} defaultValue={editing !== "new" ? editing.actions || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="deadline" type="date" defaultValue={editing !== "new" ? editing.deadline || "" : ""} className="admin-input" /></label>
          <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Propose an engagement update" : "Proposer une mise a jour de l'engagement"}</h3>
          <label className="grid gap-2 text-sm font-bold">{en ? "New position" : "Nouvelle position"}<select name="proposed_position" defaultValue={editing !== "new" ? editing.proposed_position || "" : ""} className="admin-input"><option value="">{en ? "No change" : "Aucun changement"}</option>{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "New influence level" : "Nouveau niveau d'influence"}<select name="proposed_influence_level" defaultValue={editing !== "new" ? editing.proposed_influence_level || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "New interest level" : "Nouveau niveau d'interet"}<select name="proposed_interest_level" defaultValue={editing !== "new" ? editing.proposed_interest_level || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
