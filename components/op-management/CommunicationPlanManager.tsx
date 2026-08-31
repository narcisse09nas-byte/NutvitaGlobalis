"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { CommunicationChannel, CommunicationItem, CommunicationPlanReview, CommunicationStatus, PPMResource, Stakeholder } from "@/lib/ppm/types";

const channelLabels: Record<CommunicationChannel, { fr: string; en: string }> = { email: { fr: "Email", en: "Email" }, meeting: { fr: "Reunion", en: "Meeting" }, report: { fr: "Rapport", en: "Report" }, sms: { fr: "SMS", en: "SMS" }, radio: { fr: "Radio", en: "Radio" }, phone: { fr: "Telephone", en: "Phone" }, other: { fr: "Autre", en: "Other" } };
const statusLabels: Record<CommunicationStatus, { fr: string; en: string }> = { planned: { fr: "Planifie", en: "Planned" }, sent: { fr: "Envoye", en: "Sent" }, done: { fr: "Realise", en: "Done" }, cancelled: { fr: "Annule", en: "Cancelled" } };
const statusTones: Record<CommunicationStatus, string> = {
  planned: "bg-slate-100 text-slate-600", sent: "bg-sky-50 text-sky-800", done: "bg-mint text-forest", cancelled: "bg-red-50 text-red-700",
};

export default function CommunicationPlanManager({ projectId, initial, stakeholders, staff = [] }: {
  projectId: string; initial: CommunicationItem[]; stakeholders: Stakeholder[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<CommunicationItem | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewing,setReviewing]=useState<CommunicationItem|null>(null);const[historyFor,setHistoryFor]=useState<CommunicationItem|null>(null);const[reviews,setReviews]=useState<CommunicationPlanReview[]>([]);
  const stakeholderLabel = (id?: string | null) => stakeholders.find(item => item.id === id)?.name;

  async function openHistory(row:CommunicationItem){const r=await createClient().from("ppm_communication_plan_reviews").select("*").eq("communication_item_id",row.id).order("created_at",{ascending:false});setReviews((r.data||[]) as CommunicationPlanReview[]);setHistoryFor(row);}
  async function submitReview(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!reviewing)return;const f=new FormData(e.currentTarget),payload={project_id:projectId,communication_item_id:reviewing.id,review_date:String(f.get("review_date")),reviewer_name:String(f.get("reviewer_name")||"")||null,responsible_name:String(f.get("responsible_name")||"")||null,status:String(f.get("status")) as CommunicationStatus,next_date:String(f.get("next_date")||"")||null,last_sent_date:String(f.get("last_sent_date")||"")||null,notes:String(f.get("notes")||"")||null};const sb=createClient();const{data:{user}}=await sb.auth.getUser();const r=await sb.from("ppm_communication_plan_reviews").insert({...payload,created_by:user?.id}).select("*").single();if(r.error){setMessage(r.error.message);return}const u=await sb.from("ppm_communication_items").update({responsible_name:payload.responsible_name,status:payload.status,next_date:payload.next_date,last_sent_date:payload.last_sent_date,notes:payload.notes}).eq("id",reviewing.id).select("*").single();if(!u.error)setRows(cur=>cur.map(x=>x.id===reviewing.id?u.data as CommunicationItem:x));setReviewing(null);}

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      stakeholder_id: form.getAll("stakeholder_ids").map(String).filter(Boolean)[0] || null,
      stakeholder_ids: form.getAll("stakeholder_ids").map(String).filter(Boolean),
      audience: String(form.get("audience") || "").trim() || null,
      topic: String(form.get("topic") || "").trim(),
      message: String(form.get("message") || "").trim() || null,
      channel: String(form.get("channel") || "email") as CommunicationChannel,
      frequency: String(form.get("frequency") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      next_date: String(form.get("next_date") || "") || null,
      last_sent_date: String(form.get("last_sent_date") || "") || null,
      status: String(form.get("status") || "planned") as CommunicationStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.topic) { setSaving(false); setMessage(en ? "Topic is required." : "Le sujet est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_communication_items").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_communication_items").update(payload).eq("id", (editing as CommunicationItem).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as CommunicationItem, ...current] : current.map(row => row.id === result.data.id ? result.data as CommunicationItem : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Communication plan" : "Plan de communication"}</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New communication" : "Nouvelle communication"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">{en ? "Topic" : "Sujet"}</th><th className="p-4">{en ? "Audience" : "Audience"}</th><th className="p-4">{en ? "Channel" : "Canal"}</th><th className="p-4">{en ? "Frequency" : "Frequence"}</th><th className="p-4">{en ? "Next deadline" : "Prochaine echeance"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4 font-mono text-xs font-bold text-forest">{row.communication_code||row.id.slice(0,8)}</td>
            <td className="p-4"><b className="text-forest">{row.topic}</b>{row.responsible_name && <p className="mt-1 text-xs text-slate-400">{en ? "Responsible" : "Responsable"} : {row.responsible_name}</p>}</td>
            <td className="p-4">{stakeholderLabel(row.stakeholder_id) || row.audience || "—"}</td>
            <td className="p-4">{channelLabels[row.channel][locale]}</td>
            <td className="p-4">{row.frequency || "—"}</td>
            <td className="p-4">{row.next_date ? new Date(row.next_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span></td>
            <td className="p-4"><div className="flex gap-2"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button><button onClick={()=>setReviewing(row)} className="btn-primary px-3 py-2 text-xs">{en?"Review":"Reviser"}</button><button onClick={()=>openHistory(row)} className="text-xs underline">{en?"History":"Historique"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{en ? "No communication planned." : "Aucune communication planifiee."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New communication" : "Nouvelle communication") : (en ? "Edit communication" : "Modifier la communication")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Topic" : "Sujet"}<input name="topic" defaultValue={editing !== "new" ? editing.topic : ""} required className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold">{en?"Stakeholders":"Parties prenantes"}<div className="max-h-40 overflow-y-auto rounded-xl border p-2">{stakeholders.map(item=><label key={item.id} className="flex items-center gap-2 p-1 text-sm font-normal"><input type="checkbox" name="stakeholder_ids" value={item.id} defaultChecked={editing!=="new"?((editing.stakeholder_ids||[editing.stakeholder_id]).filter(Boolean).includes(item.id)):false}/>{item.name}</label>)}</div></div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Audience (if not listed)" : "Audience (si non listee)"}<input name="audience" defaultValue={editing !== "new" ? editing.audience || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Message" : "Message"}<textarea name="message" rows={2} defaultValue={editing !== "new" ? editing.message || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Channel" : "Canal"}<select name="channel" defaultValue={editing !== "new" ? editing.channel : "email"} className="admin-input">{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Frequency" : "Frequence"}<input name="frequency" defaultValue={editing !== "new" ? editing.frequency || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "planned"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Next deadline" : "Prochaine echeance"}<input name="next_date" type="date" defaultValue={editing !== "new" ? editing.next_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Last distribution / session" : "Derniere diffusion / Session"}<input name="last_sent_date" type="date" defaultValue={editing !== "new" ? editing.last_sent_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
    {reviewing&&<div className="ppm-modal-backdrop fixed inset-0 z-[150] p-4"><form onSubmit={submitReview} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7"><button type="button" onClick={()=>setReviewing(null)} className="float-right"><XMarkIcon className="h-6"/></button><h2 className="text-xl font-black">{en?"Review communication plan":"Reviser le plan de communication"}</h2><div className="mt-5 grid gap-3"><input name="review_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} className="admin-input"/><select name="reviewer_name" className="admin-input"><option value="">-</option>{staff.map(x=><option key={x.id}>{x.name}</option>)}</select><select name="responsible_name" defaultValue={reviewing.responsible_name||""} className="admin-input"><option value="">-</option>{staff.map(x=><option key={x.id}>{x.name}</option>)}</select><select name="status" defaultValue={reviewing.status} className="admin-input">{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l[locale]}</option>)}</select><input name="next_date" type="date" defaultValue={reviewing.next_date||""} className="admin-input"/><label className="text-sm font-bold">{en?"Last distribution / session":"Derniere diffusion / Session"}<input name="last_sent_date" type="date" defaultValue={reviewing.last_sent_date||""} className="admin-input"/></label><textarea name="notes" defaultValue={reviewing.notes||""} className="admin-input"/><button className="btn-primary">{en?"Save review":"Enregistrer la revue"}</button></div></form></div>}
    {historyFor&&<div className="ppm-modal-backdrop fixed inset-0 z-[150] p-4"><div className="mx-auto my-10 max-w-5xl rounded-[30px] bg-white p-7"><button onClick={()=>setHistoryFor(null)} className="float-right"><XMarkIcon className="h-6"/></button><h2 className="text-xl font-black">{en?"Plan review history":"Historique des revues du plan"}</h2><table className="mt-5 w-full text-sm"><thead><tr><th>Date</th><th>{en?"Responsible":"Responsable"}</th><th>Statut</th><th>{en?"Next deadline":"Prochaine echeance"}</th><th>{en?"Last distribution / session":"Derniere diffusion / Session"}</th><th>Notes</th></tr></thead><tbody>{reviews.map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.review_date}<small className="block">{r.reviewer_name}</small></td><td>{r.responsible_name}</td><td>{statusLabels[r.status][locale]}</td><td>{r.next_date}</td><td>{r.last_sent_date}</td><td>{r.notes}</td></tr>)}</tbody></table></div></div>}  </div>;
}
