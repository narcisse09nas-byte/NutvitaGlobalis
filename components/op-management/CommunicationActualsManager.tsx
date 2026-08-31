"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import WorkflowStatusActions, { type WorkflowAction } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { CommunicationActual, CommunicationActualStatus, CommunicationChannel, CommunicationItem, PPMResource, Stakeholder } from "@/lib/ppm/types";

const channelLabels: Record<CommunicationChannel, { fr: string; en: string }> = { email: { fr: "Email", en: "Email" }, meeting: { fr: "Reunion", en: "Meeting" }, report: { fr: "Rapport", en: "Report" }, sms: { fr: "SMS", en: "SMS" }, radio: { fr: "Radio", en: "Radio" }, phone: { fr: "Telephone", en: "Phone" }, other: { fr: "Autre", en: "Other" } };
const statusLabels: Record<CommunicationActualStatus,{fr:string;en:string}>={draft:{fr:"Brouillon",en:"Draft"},submitted:{fr:"Soumise",en:"Submitted"},verified:{fr:"Verifiee",en:"Verified"},approved:{fr:"Approuvee",en:"Approved"},returned:{fr:"Retournee",en:"Returned"},rejected:{fr:"Rejetee",en:"Rejected"}};
const statusTones:Record<CommunicationActualStatus,string>={draft:"bg-slate-100 text-slate-600",submitted:"bg-sky-50 text-sky-800",verified:"bg-amber-50 text-amber-800",approved:"bg-mint text-forest",returned:"bg-orange/10 text-orange",rejected:"bg-red-50 text-red-700"};
const workflowActions=(status:CommunicationActualStatus):WorkflowAction[]=>status==="draft"||status==="returned"?[{value:"submitted",label:"Soumettre",tone:"primary",requireNote:true}]:status==="submitted"?[{value:"verified",label:"Verifier",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true},{value:"rejected",label:"Rejeter",tone:"danger",requireNote:true}]:status==="verified"?[{value:"approved",label:"Approuver",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true}]:[];

export default function CommunicationActualsManager({ projectId, initial, communicationItems, stakeholders = [], staff = [] }: {
  projectId: string; initial: CommunicationActual[]; communicationItems: CommunicationItem[]; stakeholders?: Stakeholder[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<CommunicationActual | "new" | null>(null);
  // Refinement program, Wave 7 (item 38): selecting the planned communication auto-fills known
  // fields; the "meeting" channel shows an agenda field (dynamic per communication type).
  const [planId, setPlanId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [channel, setChannel] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingActions,setPendingActions]=useState<{title:string;responsible_name:string;due_date:string}[]>([]);

  function openEditor(row: CommunicationActual | "new") {
    setMessage("");
    setPlanId(row !== "new" ? row.communication_item_id || "" : "");
    setPlannedDate(row !== "new" ? row.planned_date || "" : "");
    setChannel(row !== "new" ? row.channel || "" : "");
    setSubject(row !== "new" ? row.subject : "");
    setPendingActions([]);
    setEditing(row);
  }
  function handlePlanChange(itemId: string) {
    setPlanId(itemId);
    const item = communicationItems.find(row => row.id === itemId);
    if (item) {
      if (item.next_date) setPlannedDate(item.next_date);
      setChannel(item.channel);
      setSubject(item.topic);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const selectedStakeholders = form.getAll("stakeholder_names").map(String).filter(Boolean);
    const payload = {
      project_id: projectId,
      communication_item_id: planId || null,
      planned_date: plannedDate || null,
      actual_date: String(form.get("actual_date") || "") || null,
      stakeholders: selectedStakeholders.join(", ") || null,
      participants: String(form.get("participants") || "").trim() || null,
      channel: channel || null,
      agenda: channel === "meeting" ? String(form.get("agenda") || "").trim() || null : null,
      beneficiary_count: form.get("beneficiary_count") ? Number(form.get("beneficiary_count")) : null,
      subject: subject.trim(),
      key_messages: String(form.get("key_messages") || "").trim() || null,
      information_shared: String(form.get("information_shared") || "").trim() || null,
      feedback_received: String(form.get("feedback_received") || "").trim() || null,
      decisions: String(form.get("decisions") || "").trim() || null,
      actions: String(form.get("actions") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      deadline: String(form.get("deadline") || "") || null,
      minutes_reference: String(form.get("minutes_reference") || "").trim() || null,
      status: editing && editing !== "new" ? editing.status : "draft" as CommunicationActualStatus,
    };
    if (!payload.subject) { setSaving(false); setMessage(en ? "Subject is required." : "Le sujet est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_communication_actuals").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_communication_actuals").update(payload).eq("id", (editing as CommunicationActual).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved=result.data as CommunicationActual;
    if(isNew&&pendingActions.length)await supabase.from("ppm_communication_actions").insert(pendingActions.filter(item=>item.title.trim()).map(item=>({project_id:projectId,source_type:"communication_actual",source_id:saved.id,title:item.title.trim(),responsible_name:item.responsible_name||null,due_date:item.due_date||null,created_by:user?.id})));
    setRows(current => isNew ? [saved, ...current] : current.map(row => row.id === result.data.id ? saved : row));
    setEditing(null);
  }

  async function changeStatus(row:CommunicationActual,nextStatus:string,reviewedByName:string|null,note:string|null){const supabase=createClient();const result=await supabase.from("ppm_communication_actuals").update({status:nextStatus}).eq("id",row.id).select("*").single();if(result.error)return{error:result.error.message};const{data:{user}}=await supabase.auth.getUser();await supabase.from("ppm_history").insert({entity_type:"project",entity_id:projectId,actor_id:user?.id,action:`Communication ${row.actual_code||row.id}`,from_status:row.status,to_status:nextStatus,note:`${reviewedByName||""} ${note||""}`.trim()});setRows(current=>current.map(item=>item.id===row.id?result.data as CommunicationActual:item));}

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Communications carried out" : "Communications realisees"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "Record a communication" : "Enregistrer une communication"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">ID Com realisee</th><th className="p-3">ID Com planifiee</th><th className="p-3">{en?"Subject":"Sujet"}</th><th className="p-3">Date</th><th className="p-3">{en?"Channel":"Canal"}</th><th className="p-3">{en?"Stakeholders":"Parties prenantes"}</th><th className="p-3">Workflow</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t align-top"><td className="p-3 font-mono text-xs font-bold text-forest">{row.actual_code||row.id.slice(0,8)}</td><td className="p-3 font-mono text-xs">{communicationItems.find(item=>item.id===row.communication_item_id)?.communication_code||"-"}</td><td className="p-3 font-bold text-forest">{row.subject}</td><td className="p-3">{row.actual_date||"-"}</td><td className="p-3">{row.channel||"-"}</td><td className="p-3">{row.stakeholders||"-"}</td><td className="p-3"><WorkflowStatusActions entityLabel={en?"Communication carried out":"Communication realisee"} itemTitle={row.subject} status={row.status} statusLabels={Object.fromEntries(Object.entries(statusLabels).map(([k,v])=>[k,v[locale]]))} statusTones={statusTones} actions={workflowActions(row.status)} staff={staff} onConfirm={input=>changeStatus(row,input.nextStatus,input.reviewedByName,input.note)}/></td><td className="p-3">{["draft","returned"].includes(row.status)&&<button onClick={()=>openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en?"Edit":"Modifier"}</button>}</td></tr>)}{!rows.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-400">{en?"No communication recorded.":"Aucune communication realisee enregistree."}</td></tr>}</tbody></table></div>
    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "Record a communication" : "Enregistrer une communication") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Planned communication" : "Communication planifiee"}<select value={planId} onChange={event => handlePlanChange(event.target.value)} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{communicationItems.map(item => <option key={item.id} value={item.id}>{item.topic}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Subject" : "Sujet"}<input value={subject} onChange={event => setSubject(event.target.value)} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Planned date" : "Date prevue"}<input type="date" value={plannedDate} onChange={event => setPlannedDate(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Actual date" : "Date reelle"}<input name="actual_date" type="date" defaultValue={editing !== "new" ? editing.actual_date || "" : ""} className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            {en ? "Stakeholders reached" : "Parties prenantes atteintes"}
            <div className="max-h-40 overflow-y-auto rounded-xl border p-2">
              {stakeholders.map(item => <label key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-normal hover:bg-mint/40"><input type="checkbox" name="stakeholder_names" value={item.name} defaultChecked={editing !== "new" ? (editing.stakeholders || "").split(",").map(v => v.trim()).includes(item.name) : false} className="h-4 w-4" />{item.name}</label>)}
              {!stakeholders.length && <p className="p-2 text-sm text-slate-400">{en ? "No stakeholder recorded." : "Aucune partie prenante enregistree."}</p>}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Participants (number / names)" : "Participants (nombre / noms)"}<input name="participants" defaultValue={editing !== "new" ? editing.participants || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Beneficiaries reached (if applicable)" : "Beneficiaires atteints (si applicable)"}<input name="beneficiary_count" type="number" min="0" defaultValue={editing !== "new" ? editing.beneficiary_count ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Channel" : "Canal"}<select value={channel} onChange={event => setChannel(event.target.value)} className="admin-input"><option value="">—</option>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "draft"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {channel === "meeting" && <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Agenda" : "Ordre du jour (agenda)"}<textarea name="agenda" rows={2} defaultValue={editing !== "new" ? editing.agenda || "" : ""} className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Key messages" : "Messages cles"}<textarea name="key_messages" rows={2} defaultValue={editing !== "new" ? editing.key_messages || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Information shared" : "Informations partagees"}<textarea name="information_shared" rows={2} defaultValue={editing !== "new" ? editing.information_shared || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Feedback received" : "Feedback recu"}<textarea name="feedback_received" rows={2} defaultValue={editing !== "new" ? editing.feedback_received || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Decisions" : "Decisions"}<textarea name="decisions" rows={2} defaultValue={editing !== "new" ? editing.decisions || "" : ""} className="admin-input" /></label>
          <div className="grid gap-3 sm:col-span-2"><div className="flex justify-between"><h3 className="text-sm font-black">{en?"Generated actions":"Actions generees"}</h3><button type="button" onClick={()=>setPendingActions(current=>[...current,{title:"",responsible_name:"",due_date:""}])} className="btn-secondary px-3 py-1 text-xs">+ Add</button></div>{pendingActions.map((item,index)=><div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[90px_1fr_1fr_150px]"><span className="font-mono text-xs">ComAc-auto</span><input value={item.title} onChange={e=>setPendingActions(cur=>cur.map((x,i)=>i===index?{...x,title:e.target.value}:x))} placeholder={en?"Action":"Action"} className="admin-input"/><select value={item.responsible_name} onChange={e=>setPendingActions(cur=>cur.map((x,i)=>i===index?{...x,responsible_name:e.target.value}:x))} className="admin-input"><option value="">-</option>{staff.map(x=><option key={x.id}>{x.name}</option>)}</select><input type="date" value={item.due_date} onChange={e=>setPendingActions(cur=>cur.map((x,i)=>i===index?{...x,due_date:e.target.value}:x))} className="admin-input"/></div>)}</div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="deadline" type="date" defaultValue={editing !== "new" ? editing.deadline || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Minutes reference" : "Reference PV"}<input name="minutes_reference" defaultValue={editing !== "new" ? editing.minutes_reference || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
