"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, Issue, IssueReview, IssueStatus, PPMResource, ProjectPriority, Stakeholder, WBSNode } from "@/lib/ppm/types";

const statusLabels: Record<IssueStatus, { fr: string; en: string }> = { open: { fr: "Ouvert", en: "Open" }, in_progress: { fr: "En cours", en: "In progress" }, resolved: { fr: "Resolu", en: "Resolved" }, closed: { fr: "Cloture", en: "Closed" } };
const statusTones: Record<IssueStatus, string> = {
  open: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-800",
  resolved: "bg-mint text-forest", closed: "bg-slate-100 text-slate-600",
};
const priorityLabels: Record<ProjectPriority, { fr: string; en: string }> = { low: { fr: "Basse", en: "Low" }, medium: { fr: "Moyenne", en: "Medium" }, high: { fr: "Haute", en: "High" }, critical: { fr: "Critique", en: "Critical" } };
const issueCategories=["technical","operational","financial","contractual","quality","security","human_resources","stakeholder","other_external"];

export default function IssueManager({ projectId, initial, initialReviews, wbsNodes, activities, staff = [], stakeholders = [] }: {
  projectId: string; initial: Issue[]; initialReviews: IssueReview[]; wbsNodes: WBSNode[]; activities: Activity[]; staff?: PPMResource[]; stakeholders?: Stakeholder[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const raisedByOptions = [
    ...staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title ? `${item.role_title} (Staff)` : "Staff" })),
    ...stakeholders.map(item => ({ value: item.name, label: item.name, hint: en ? "Stakeholder" : "Partie prenante" })),
  ];
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Issue | "new" | null>(null);
  const [reviews,setReviews]=useState(initialReviews); const [reviewing,setReviewing]=useState<Issue|null>(null); const [historyFor,setHistoryFor]=useState<Issue|null>(null); const [categoryChoice,setCategoryChoice]=useState("");
  function openEditor(row:Issue|"new"){const value=row==="new"?"":row.category||"";setCategoryChoice(value?(issueCategories.includes(value)?value:"other_perso"):"");setEditing(row);}
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const wbsLabel = (id?: string | null) => wbsNodes.find(item => item.id === id)?.title || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";

  async function submitReview(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!reviewing)return;const form=new FormData(event.currentTarget);const payload={project_id:projectId,issue_id:reviewing.id,review_date:String(form.get("review_date")||new Date().toISOString().slice(0,10)),reviewer_name:String(form.get("reviewer_name")||"").trim()||null,priority:String(form.get("priority")||reviewing.priority) as ProjectPriority,owner_name:String(form.get("owner_name")||reviewing.owner_name||"").trim()||null,due_date:String(form.get("due_date")||"")||null,status_after:String(form.get("status_after")||reviewing.status) as IssueStatus,action:String(form.get("action")||"").trim()||null,notes:String(form.get("notes")||"").trim()||null};const supabase=createClient();const{data:{user}}=await supabase.auth.getUser();const result=await supabase.from("ppm_issue_reviews").insert({...payload,created_by:user?.id}).select("*").single();if(result.error){setMessage(result.error.message);return}setReviews(current=>[result.data as IssueReview,...current]);const updated=await supabase.from("ppm_issues").update({priority:payload.priority,owner_name:payload.owner_name,due_date:payload.due_date,status:payload.status_after}).eq("id",reviewing.id).select("*").single();if(!updated.error)setRows(current=>current.map(item=>item.id===reviewing.id?updated.data as Issue:item));setReviewing(null);}
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
      category: categoryChoice === "other_perso" ? String(form.get("category_other") || "").trim() || null : categoryChoice || null,
      raised_by_name: String(form.get("raised_by_name") || "").trim() || null,
      priority: String(form.get("priority") || "medium") as ProjectPriority,
      owner_name: String(form.get("owner_name") || "").trim() || null,
      resolution_plan: String(form.get("resolution_plan") || "").trim() || null,
      due_date: String(form.get("due_date") || "") || null,
      cost: form.get("cost") ? Number(form.get("cost")) : null,
      currency: String(form.get("currency") || "XAF"),
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
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Issue register" : "Registre des issues"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New issue" : "Nouvelle issue"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">Issue</th><th className="p-4">{en ? "Linked to" : "Rattachement"}</th><th className="p-4">{en ? "Priority" : "Priorite"}</th><th className="p-4">{en ? "Owner" : "Proprietaire"}</th><th className="p-4">{en ? "Deadline" : "Echeance"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4 font-mono text-xs font-bold text-forest">{row.issue_code||row.id.slice(0,8)}</td>
            <td className="p-4"><b className="text-forest">{row.title}</b>{row.category && <p className="mt-1 text-xs text-slate-400">{row.category}</p>}</td>
            <td className="p-4">{row.work_package_id ? wbsLabel(row.work_package_id) : row.activity_id ? activityLabel(row.activity_id) : "—"}</td>
            <td className="p-4">{priorityLabels[row.priority][locale]}</td>
            <td className="p-4">{row.owner_name || "—"}</td>
            <td className="p-4">{row.due_date ? new Date(row.due_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button>{row.status!=="closed"&&<button onClick={()=>setReviewing(row)} className="btn-primary px-3 py-2 text-xs">{en?"Review":"Reviser"}</button>}{reviews.some(item=>item.issue_id===row.id)&&<button onClick={()=>setHistoryFor(row)} className="text-xs font-bold underline text-slate-500">{en?"History":"Historique"}</button>}</div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{en ? "No issue recorded." : "Aucune issue enregistree."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New issue" : "Nouvelle issue") : (en ? "Edit issue" : "Modifier l'issue")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Activity" : "Activite"}<select name="activity_id" defaultValue={editing !== "new" ? editing.activity_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <div className="grid gap-2"><label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select value={categoryChoice} onChange={e=>setCategoryChoice(e.target.value)} className="admin-input"><option value="">-</option>{issueCategories.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}<option value="other_perso">{en?"Other (specify)":"Autre a preciser"}</option></select></label>{categoryChoice==="other_perso"&&<input name="category_other" defaultValue={editing!=="new"&&!issueCategories.includes(editing.category||"")?editing.category||"":""} required className="admin-input"/>}</div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Raised by" : "Signale par"}<SearchableSelect name="raised_by_name" options={raisedByOptions} defaultValue={editing !== "new" ? editing.raised_by_name || "" : ""} allowOther otherLabel={en ? "Name (staff or stakeholder)" : "Nom (staff ou partie prenante)"} placeholder={en ? "Select..." : "Selectionner..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Priority" : "Priorite"}<select name="priority" defaultValue={editing !== "new" ? editing.priority : "medium"} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Owner" : "Proprietaire"}<SearchableSelect name="owner_name" options={staffOptions} defaultValue={editing !== "new" ? editing.owner_name || "" : ""} allowOther otherLabel={en ? "Owner name" : "Nom du proprietaire"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Resolution plan" : "Plan de resolution"}<textarea name="resolution_plan" rows={2} defaultValue={editing !== "new" ? editing.resolution_plan || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="due_date" type="date" defaultValue={editing !== "new" ? editing.due_date || "" : ""} className="admin-input" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold">{en?"Cost":"Cout"}<input name="cost" type="number" min="0" step="0.01" defaultValue={editing!=="new"?editing.cost??"":""} className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">{en?"Currency":"Devise"}<input name="currency" defaultValue={editing!=="new"?editing.currency||"XAF":"XAF"} className="admin-input"/></label></div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "open"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {reviewing&&<div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><form onSubmit={submitReview} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black text-forest">{en?"Review":"Reviser"} — {reviewing.title}</h2><button type="button" onClick={()=>setReviewing(null)}><XMarkIcon className="h-6"/></button></div><div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-bold">Date<input name="review_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">{en?"Reviewed by":"Revu par"}<SearchableSelect name="reviewer_name" options={staffOptions} allowOther/></label><label className="grid gap-2 text-sm font-bold">{en?"Priority":"Priorite"}<select name="priority" defaultValue={reviewing.priority} className="admin-input">{Object.entries(priorityLabels).map(([value,label])=><option key={value} value={value}>{label[locale]}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">{en?"Owner":"Proprietaire"}<SearchableSelect name="owner_name" options={staffOptions} defaultValue={reviewing.owner_name||""} allowOther/></label><label className="grid gap-2 text-sm font-bold">{en?"Deadline":"Echeance"}<input name="due_date" type="date" defaultValue={reviewing.due_date||""} className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">{en?"Status":"Statut"}<select name="status_after" defaultValue={reviewing.status} className="admin-input">{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label[locale]}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Action<textarea name="action" required rows={2} className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} className="admin-input"/></label>{message&&<p className="rounded-xl bg-amber-50 p-3 text-sm">{message}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={()=>setReviewing(null)} className="btn-secondary">{en?"Cancel":"Annuler"}</button><button className="btn-primary">{en?"Save review":"Enregistrer la revue"}</button></div></div></form></div>}
    {historyFor&&<div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><div className="mx-auto my-10 max-w-4xl rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black text-forest">{en?"Issue review history":"Historique des revues de l issue"} — {historyFor.title}</h2><button onClick={()=>setHistoryFor(null)}><XMarkIcon className="h-6"/></button></div><div className="mt-5 overflow-x-auto rounded-xl border"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">{en?"Priority":"Priorite"}</th><th className="p-3">{en?"Owner":"Proprietaire"}</th><th className="p-3">{en?"Deadline":"Echeance"}</th><th className="p-3">{en?"Status":"Statut"}</th><th className="p-3">Action</th></tr></thead><tbody>{reviews.filter(item=>item.issue_id===historyFor.id).map(item=><tr key={item.id} className="border-t"><td className="p-3">{new Date(item.review_date).toLocaleDateString(en?"en-US":"fr-FR")}<small className="block text-slate-400">{item.reviewer_name}</small></td><td className="p-3">{priorityLabels[item.priority][locale]}</td><td className="p-3">{item.owner_name||"-"}</td><td className="p-3">{item.due_date||"-"}</td><td className="p-3">{statusLabels[item.status_after][locale]}</td><td className="p-3">{item.action||item.notes||"-"}</td></tr>)}</tbody></table></div></div></div>}  </div>;
}
