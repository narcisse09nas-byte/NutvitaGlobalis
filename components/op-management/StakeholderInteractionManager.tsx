"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMResource, Stakeholder, StakeholderInteraction, StakeholderInteractionReview, StakeholderLevel, StakeholderPosition } from "@/lib/ppm/types";

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
  const [historyFor, setHistoryFor] = useState<StakeholderInteraction | null>(null);
  const [reviews, setReviews] = useState<StakeholderInteractionReview[]>([]);
  const [interactionType,setInteractionType]=useState(""); const [pendingActions,setPendingActions]=useState<{title:string;responsible_name:string;due_date:string}[]>([]);
  const interactionTypes=["meeting","consultation","workshop","interview","phone_call","email_exchange","field_visit","community_dialogue"];
  function openEditor(row:StakeholderInteraction|"new"){const type=row==="new"?"":row.interaction_type||"";setInteractionType(type?(interactionTypes.includes(type)?type:"other"):"");setPendingActions([]);setEditing(row);}
  const stakeholderLabel = (id: string) => stakeholders.find(item => item.id === id)?.name || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const proposedPosition = String(form.get("proposed_position") || "") as StakeholderPosition;
    const selectedStakeholders=form.getAll("stakeholder_ids").map(String).filter(Boolean);
    const payload = {
      project_id: projectId,
      stakeholder_id: selectedStakeholders[0] || "",
      stakeholder_ids: selectedStakeholders,
      interaction_date: String(form.get("interaction_date") || "") || null,
      interaction_type: interactionType === "other" ? String(form.get("interaction_type_other") || "").trim() || null : interactionType || null,
      interaction_type_other: interactionType === "other" ? String(form.get("interaction_type_other") || "").trim() || null : null,
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
    const saved=result.data as StakeholderInteraction;
    if (!isNew) await supabase.from("ppm_stakeholder_interaction_reviews").insert({ project_id: projectId, interaction_id: saved.id, review_date: String(form.get("review_date") || new Date().toISOString().slice(0, 10)), reviewer_name: String(form.get("reviewer_name") || "").trim() || null, proposed_position: saved.proposed_position, proposed_influence_level: saved.proposed_influence_level, proposed_interest_level: saved.proposed_interest_level, position_change_status: saved.position_change_status, notes: String(form.get("review_notes") || "").trim() || null, created_by: user?.id });
    if(isNew&&pendingActions.length)await supabase.from("ppm_communication_actions").insert(pendingActions.filter(item=>item.title.trim()).map(item=>({project_id:projectId,source_type:"stakeholder_interaction",source_id:saved.id,title:item.title.trim(),responsible_name:item.responsible_name||null,due_date:item.due_date||null,created_by:user?.id})));
    setRows(current => isNew ? [saved, ...current] : current.map(row => row.id === result.data.id ? saved : row));
    setEditing(null);
  }

  async function decidePositionChange(row: StakeholderInteraction, approve: boolean) {
    const supabase = createClient();
    const reviewerName = window.prompt(en ? "Reviewer name" : "Nom du validateur")?.trim();
    if (!reviewerName) return;
    const notes = window.prompt(en ? "Decision comments" : "Commentaires de decision")?.trim();
    if (!notes) return;
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_stakeholder_interactions").update({ position_change_status: approve ? "approved" : "rejected" }).eq("id", row.id).select("*").single();
    if (result.error) return;
    await supabase.from("ppm_stakeholder_interaction_reviews").insert({ project_id: projectId, interaction_id: row.id, review_date: new Date().toISOString().slice(0, 10), reviewer_name: reviewerName, proposed_position: row.proposed_position, proposed_influence_level: row.proposed_influence_level, proposed_interest_level: row.proposed_interest_level, position_change_status: approve ? "approved" : "rejected", approval_date: new Date().toISOString().slice(0, 10), notes, created_by: user?.id });
    setRows(current => current.map(item => item.id === row.id ? result.data as StakeholderInteraction : item));
    if (approve && row.proposed_position) await supabase.from("ppm_stakeholders").update({ position: row.proposed_position, influence_level: row.proposed_influence_level || undefined, interest_level: row.proposed_interest_level || undefined }).in("id", row.stakeholder_ids?.length ? row.stakeholder_ids : [row.stakeholder_id]);
  }

  async function openHistory(row: StakeholderInteraction) {
    const result = await createClient().from("ppm_stakeholder_interaction_reviews").select("*").eq("interaction_id", row.id).order("created_at", { ascending: false });
    setReviews((result.data || []) as StakeholderInteractionReview[]);
    setHistoryFor(row);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Stakeholder interactions" : "Interactions avec les parties prenantes"}</h2>
      <button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "Record an interaction" : "Enregistrer une interaction"}</button>
    </div>
    {/* Refinement program, Wave 7 (item 39): the button used to be silently disabled with no
        explanation when no Stakeholder existed yet — indistinguishable from "broken." */}
    {!stakeholders.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "First add a stakeholder (Team or Stakeholders tab) to be able to record an interaction." : "Ajoutez d'abord une partie prenante (onglet Equipe ou Parties prenantes) pour pouvoir enregistrer une interaction."}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">ID</th><th className="p-3">{en?"Stakeholders":"Parties prenantes"}</th><th className="p-3">{en?"Type / date":"Type / date"}</th><th className="p-3">{en?"Observed engagement":"Engagement observe"}</th><th className="p-3">{en?"Proposed changes":"Changements proposes"}</th><th className="p-3">{en?"Approval":"Approbation"}</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t align-top"><td className="p-3 font-mono text-xs font-bold text-forest">{row.interaction_code||row.id.slice(0,8)}</td><td className="p-3">{(row.stakeholder_ids||[row.stakeholder_id]).map(stakeholderLabel).join(", ")}</td><td className="p-3">{row.interaction_type||"-"}<small className="block">{row.interaction_date}</small></td><td className="p-3">{row.engagement_observed||"-"}</td><td className="p-3">{row.proposed_position?positionLabels[row.proposed_position][locale]:"-"}</td><td className="p-3">{row.position_change_status}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={()=>openEditor(row)} className="btn-secondary px-3 py-1 text-xs">{en?"Review":"Reviser"}</button><button onClick={()=>openHistory(row)} className="text-xs font-bold underline">{en?"History":"Historique"}</button>{row.position_change_status==="proposed"&&<><button onClick={()=>decidePositionChange(row,true)} className="btn-primary px-3 py-1 text-xs">{en?"Approve":"Approuver"}</button><button onClick={()=>decidePositionChange(row,false)} className="btn-secondary px-3 py-1 text-xs">{en?"Reject":"Rejeter"}</button></>}</div></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="p-8 text-center text-slate-400">{en?"No interaction recorded.":"Aucune interaction enregistree."}</td></tr>}</tbody></table></div>
    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "Record an interaction" : "Enregistrer une interaction") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">{en?"Stakeholders / participants":"Parties prenantes / participants"}<div className="max-h-40 overflow-y-auto rounded-xl border p-2">{stakeholders.map(item=><label key={item.id} className="flex items-center gap-2 p-1 text-sm font-normal"><input type="checkbox" name="stakeholder_ids" value={item.id} defaultChecked={editing!=="new"?((editing.stakeholder_ids||[editing.stakeholder_id]).includes(item.id)):false}/>{item.name}</label>)}</div></div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Date" : "Date"}<input name="interaction_date" type="date" defaultValue={editing !== "new" ? editing.interaction_date || "" : ""} className="admin-input" /></label>
          <div className="grid gap-2"><label className="grid gap-2 text-sm font-bold">{en?"Interaction type":"Type d interaction"}<select value={interactionType} onChange={e=>setInteractionType(e.target.value)} className="admin-input"><option value="">-</option>{interactionTypes.map(v=><option key={v} value={v}>{v.replaceAll("_"," ")}</option>)}<option value="other">{en?"Other (specify)":"Autre a preciser"}</option></select></label>{interactionType==="other"&&<input name="interaction_type_other" defaultValue={editing!=="new"&&!interactionTypes.includes(editing.interaction_type||"")?editing.interaction_type||"":""} required className="admin-input"/>}</div>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Participants" : "Participants"}<input name="participants" defaultValue={editing !== "new" ? editing.participants || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Objective" : "Objectif"}<input name="objective" defaultValue={editing !== "new" ? editing.objective || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Topics discussed" : "Sujets discutes"}<textarea name="topics_discussed" rows={2} defaultValue={editing !== "new" ? editing.topics_discussed || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Concerns" : "Preoccupations"}<textarea name="concerns" rows={2} defaultValue={editing !== "new" ? editing.concerns || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Expectations expressed" : "Attentes exprimees"}<textarea name="expectations" rows={2} defaultValue={editing !== "new" ? editing.expectations || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Observed engagement" : "Engagement observe"}<textarea name="engagement_observed" rows={2} defaultValue={editing !== "new" ? editing.engagement_observed || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Decisions" : "Decisions"}<textarea name="decisions" rows={2} defaultValue={editing !== "new" ? editing.decisions || "" : ""} className="admin-input" /></label>
          <div className="grid gap-2 sm:col-span-2"><div className="flex justify-between"><b>{en?"Generated actions":"Actions generees"}</b><button type="button" onClick={()=>setPendingActions(cur=>[...cur,{title:"",responsible_name:"",due_date:""}])} className="btn-secondary px-3 py-1 text-xs">+ Add</button></div>{pendingActions.map((item,index)=><div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_150px]"><input value={item.title} onChange={e=>setPendingActions(cur=>cur.map((x,i)=>i===index?{...x,title:e.target.value}:x))} placeholder="Action" className="admin-input"/><select value={item.responsible_name} onChange={e=>setPendingActions(cur=>cur.map((x,i)=>i===index?{...x,responsible_name:e.target.value}:x))} className="admin-input"><option value="">-</option>{staff.map(x=><option key={x.id}>{x.name}</option>)}</select><input type="date" value={item.due_date} onChange={e=>setPendingActions(cur=>cur.map((x,i)=>i===index?{...x,due_date:e.target.value}:x))} className="admin-input"/></div>)}</div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="deadline" type="date" defaultValue={editing !== "new" ? editing.deadline || "" : ""} className="admin-input" /></label>
          <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Propose an engagement update" : "Proposer une mise a jour de l'engagement"}</h3>
          <label className="grid gap-2 text-sm font-bold">{en ? "New position" : "Nouvelle position"}<select name="proposed_position" defaultValue={editing !== "new" ? editing.proposed_position || "" : ""} className="admin-input"><option value="">{en ? "No change" : "Aucun changement"}</option>{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "New influence level" : "Nouveau niveau d'influence"}<select name="proposed_influence_level" defaultValue={editing !== "new" ? editing.proposed_influence_level || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "New interest level" : "Nouveau niveau d'interet"}<select name="proposed_interest_level" defaultValue={editing !== "new" ? editing.proposed_interest_level || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {editing !== "new" && <><label className="grid gap-2 text-sm font-bold">{en ? "Review date" : "Date de revision"}<input name="review_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">{en ? "Reviewed by" : "Revise par"}<SearchableSelect name="reviewer_name" options={staffOptions} allowOther /></label><label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Review notes" : "Notes de revision"}<textarea name="review_notes" required className="admin-input" /></label></>}
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
    {historyFor && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><div className="mx-auto my-10 max-w-6xl rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black text-forest">{en ? "Interaction review history" : "Historique des revisions de l interaction"}</h2><button onClick={()=>setHistoryFor(null)}><XMarkIcon className="h-6" /></button></div><div className="mt-5 overflow-x-auto rounded-xl border"><table className="w-full min-w-[1000px] text-sm"><thead><tr><th className="p-3">Date / {en?"Reviewer":"Reviseur"}</th><th>{en?"New position":"Nouvelle position"}</th><th>{en?"New influence":"Nouvelle influence"}</th><th>{en?"New interest":"Nouvel interet"}</th><th>{en?"Approval":"Approbation"}</th><th>Notes</th></tr></thead><tbody>{reviews.map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.review_date}<small className="block">{r.reviewer_name||"-"}</small></td><td>{r.proposed_position?positionLabels[r.proposed_position][locale]:"-"}</td><td>{r.proposed_influence_level?levelLabels[r.proposed_influence_level][locale]:"-"}</td><td>{r.proposed_interest_level?levelLabels[r.proposed_interest_level][locale]:"-"}</td><td>{r.position_change_status||"-"}<small className="block">{r.approval_date||""}</small></td><td>{r.notes||"-"}</td></tr>)}</tbody></table></div></div></div>}
  </div>;
}
