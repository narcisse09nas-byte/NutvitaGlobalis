"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMResource, PPMStatus, Stakeholder, StakeholderReview, StakeholderCategory, StakeholderLevel, StakeholderPosition } from "@/lib/ppm/types";

const categoryLabels: Record<StakeholderCategory, { fr: string; en: string }> = {
  internal: { fr: "Interne", en: "Internal" }, external: { fr: "Externe", en: "External" }, donor: { fr: "Bailleur", en: "Donor" },
  beneficiary: { fr: "Beneficiaire", en: "Beneficiary" }, government: { fr: "Gouvernement", en: "Government" },
  partner: { fr: "Partenaire", en: "Partner" }, community: { fr: "Communaute", en: "Community" }, other: { fr: "Autre", en: "Other" },
};
const levelLabels: Record<StakeholderLevel, { fr: string; en: string }> = { low: { fr: "Faible", en: "Low" }, medium: { fr: "Moyen", en: "Medium" }, high: { fr: "Eleve", en: "High" } };
const positionLabels: Record<StakeholderPosition, { fr: string; en: string }> = {
  champion: { fr: "Champion", en: "Champion" }, supporter: { fr: "Soutien", en: "Supporter" }, neutral: { fr: "Neutre", en: "Neutral" },
  critic: { fr: "Critique", en: "Critic" }, blocker: { fr: "Bloquant", en: "Blocker" },
};
const positionTones: Record<StakeholderPosition, string> = {
  champion: "bg-mint text-forest", supporter: "bg-sky-50 text-sky-800", neutral: "bg-slate-100 text-slate-600",
  critic: "bg-amber-50 text-amber-800", blocker: "bg-red-50 text-red-700",
};
const engagementStrategyOptionsFr = ["Informer", "Consulter", "Impliquer", "Collaborer", "Responsabiliser", "Gerer de pres", "Satisfaire", "Suivre (effort minimal)"];
const engagementStrategyOptionsEn = ["Inform", "Consult", "Involve", "Collaborate", "Empower", "Manage closely", "Keep satisfied", "Monitor (minimal effort)"];

export default function StakeholderRegister({ projectId, initial, staff = [] }: { projectId: string; initial: Stakeholder[]; staff?: PPMResource[] }) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Stakeholder | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [reviews,setReviews]=useState<StakeholderReview[]>([]); const [reviewing,setReviewing]=useState<Stakeholder|null>(null); const [historyFor,setHistoryFor]=useState<Stakeholder|null>(null);
  const engagementStrategyOptions = en ? engagementStrategyOptionsEn : engagementStrategyOptionsFr;
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [customStrategy, setCustomStrategy] = useState("");

  function openEditing(row: Stakeholder | "new") {
    setMessage("");
    const existing = row !== "new" ? (row.engagement_strategies?.length ? row.engagement_strategies : (row.engagement_strategy ? [row.engagement_strategy] : [])) : [];
    setSelectedStrategies(existing.filter(item => engagementStrategyOptions.includes(item)));
    setCustomStrategy(existing.filter(item => !engagementStrategyOptions.includes(item)).join(", "));
    setEditing(row);
  }

  function toggleStrategy(value: string) { setSelectedStrategies(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]); }

  async function openHistory(row:Stakeholder){const result=await createClient().from("ppm_stakeholder_reviews").select("*").eq("stakeholder_id",row.id).order("created_at",{ascending:false});setReviews((result.data||[]) as StakeholderReview[]);setHistoryFor(row);}
  async function submitReview(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!reviewing)return;const form=new FormData(event.currentTarget);const strategies=String(form.get("engagement_strategies")||"").split(",").map(v=>v.trim()).filter(Boolean);const payload={project_id:projectId,stakeholder_id:reviewing.id,review_date:String(form.get("review_date")),reviewer_name:String(form.get("reviewer_name")||"").trim()||null,influence_level:String(form.get("influence_level")) as StakeholderLevel,interest_level:String(form.get("interest_level")) as StakeholderLevel,position:String(form.get("position")) as StakeholderPosition,status:String(form.get("status")) as PPMStatus,engagement_strategies:strategies,notes:String(form.get("notes")||"").trim()||null};const supabase=createClient();const{data:{user}}=await supabase.auth.getUser();const result=await supabase.from("ppm_stakeholder_reviews").insert({...payload,created_by:user?.id}).select("*").single();if(result.error){setMessage(result.error.message);return}const updated=await supabase.from("ppm_stakeholders").update({influence_level:payload.influence_level,interest_level:payload.interest_level,position:payload.position,status:payload.status,engagement_strategies:strategies}).eq("id",reviewing.id).select("*").single();if(!updated.error)setRows(current=>current.map(row=>row.id===reviewing.id?updated.data as Stakeholder:row));setReviewing(null);}
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      name: String(form.get("name") || "").trim(),
      organization: String(form.get("organization") || "").trim() || null,
      role_title: String(form.get("role_title") || "").trim() || null,
      category: String(form.get("category") || "internal") as StakeholderCategory,
      influence_level: String(form.get("influence_level") || "medium") as StakeholderLevel,
      interest_level: String(form.get("interest_level") || "medium") as StakeholderLevel,
      position: String(form.get("position") || "neutral") as StakeholderPosition,
      desired_position: String(form.get("desired_position") || "") ? (String(form.get("desired_position")) as StakeholderPosition) : null,
      contact_email: String(form.get("contact_email") || "").trim() || null,
      contact_phone: String(form.get("contact_phone") || "").trim() || null,
      engagement_strategies: [...selectedStrategies, ...customStrategy.split(",").map(item => item.trim()).filter(Boolean)],
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_stakeholders").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_stakeholders").update(payload).eq("id", (editing as Stakeholder).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as Stakeholder] : current.map(row => row.id === result.data.id ? result.data as Stakeholder : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Stakeholders" : "Parties prenantes"}</h2><button onClick={() => openEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New stakeholder" : "Nouvelle partie prenante"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">{en ? "Stakeholder" : "Partie prenante"}</th><th className="p-4">{en ? "Category" : "Categorie"}</th><th className="p-4">{en ? "Influence" : "Influence"}</th><th className="p-4">{en ? "Interest" : "Interet"}</th><th className="p-4">Position</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4 font-mono text-xs font-bold text-forest">{row.stakeholder_code||row.id.slice(0,8)}</td>
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.organization && <p className="mt-1 text-xs text-slate-400">{row.organization}{row.role_title ? ` · ${row.role_title}` : ""}</p>}</td>
            <td className="p-4">{categoryLabels[row.category][locale]}</td>
            <td className="p-4">{levelLabels[row.influence_level][locale]}</td>
            <td className="p-4">{levelLabels[row.interest_level][locale]}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${positionTones[row.position]}`}>{positionLabels[row.position][locale]}</span></td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => openEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button><button onClick={()=>setReviewing(row)} className="btn-primary px-3 py-2 text-xs">{en?"Review":"Reviser"}</button><button onClick={()=>openHistory(row)} className="text-xs font-bold underline text-slate-500">{en?"History":"Historique"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{en ? "No stakeholders registered." : "Aucune partie prenante enregistree."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New stakeholder" : "Nouvelle partie prenante") : (en ? "Edit stakeholder" : "Modifier la partie prenante")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Organization" : "Organisation"}<input name="organization" defaultValue={editing !== "new" ? editing.organization || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Role" : "Fonction"}<input name="role_title" defaultValue={editing !== "new" ? editing.role_title || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue={editing !== "new" ? editing.category : "internal"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Current position" : "Position actuelle"}<select name="position" defaultValue={editing !== "new" ? editing.position : "neutral"} className="admin-input">{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Desired position" : "Position souhaitee"}<select name="desired_position" defaultValue={editing !== "new" ? editing.desired_position || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Influence level" : "Niveau d'influence"}<select name="influence_level" defaultValue={editing !== "new" ? editing.influence_level : "medium"} className="admin-input">{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Interest level" : "Niveau d'interet"}<select name="interest_level" defaultValue={editing !== "new" ? editing.interest_level : "medium"} className="admin-input">{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Email<input name="contact_email" type="email" defaultValue={editing !== "new" ? editing.contact_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Phone" : "Telephone"}<input name="contact_phone" defaultValue={editing !== "new" ? editing.contact_phone || "" : ""} className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            {en ? "Engagement strategy" : "Strategie d'engagement"}
            <div className="grid gap-1.5 rounded-xl border p-3 sm:grid-cols-2">
              {engagementStrategyOptions.map(value => <label key={value} className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={selectedStrategies.includes(value)} onChange={() => toggleStrategy(value)} className="h-4 w-4" />{value}</label>)}
            </div>
            <input value={customStrategy} onChange={event => setCustomStrategy(event.target.value)} placeholder={en ? "Other strategy, please specify (comma-separated)" : "Autre strategie, a preciser (separees par des virgules)"} className="admin-input" />
          </div>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">{en ? "Draft" : "Brouillon"}</option><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "On hold" : "En pause"}</option><option value="closed">{en ? "Closed" : "Cloture"}</option><option value="cancelled">{en ? "Cancelled" : "Annule"}</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
    {reviewing&&<div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><form onSubmit={submitReview} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black text-forest">{en?"Review stakeholder":"Reviser la partie prenante"}</h2><button type="button" onClick={()=>setReviewing(null)}><XMarkIcon className="h-6"/></button></div><div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-bold">Date<input name="review_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">{en?"Reviewer":"Reviseur"}<select name="reviewer_name" className="admin-input"><option value="">-</option>{staff.map(item=><option key={item.id}>{item.name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Influence<select name="influence_level" defaultValue={reviewing.influence_level} className="admin-input">{Object.entries(levelLabels).map(([v,l])=><option key={v} value={v}>{l[locale]}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">{en?"Interest":"Interet"}<select name="interest_level" defaultValue={reviewing.interest_level} className="admin-input">{Object.entries(levelLabels).map(([v,l])=><option key={v} value={v}>{l[locale]}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Position<select name="position" defaultValue={reviewing.position} className="admin-input">{Object.entries(positionLabels).map(([v,l])=><option key={v} value={v}>{l[locale]}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={reviewing.status} className="admin-input"><option value="active">{en?"Active":"Actif"}</option><option value="on_hold">{en?"On hold":"En pause"}</option><option value="closed">{en?"Closed":"Cloture"}</option></select></label><label className="grid gap-2 text-sm font-bold">{en?"Engagement strategies":"Strategies d engagement"}<textarea name="engagement_strategies" defaultValue={(reviewing.engagement_strategies||[]).join(", ")} className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" className="admin-input"/></label><button className="btn-primary">{en?"Save review":"Enregistrer la revue"}</button></div></form></div>}
    {historyFor&&<div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><div className="mx-auto my-10 max-w-5xl rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex justify-between"><h2 className="text-xl font-black text-forest">{en?"Review history":"Historique des revues"}</h2><button onClick={()=>setHistoryFor(null)}><XMarkIcon className="h-6"/></button></div><div className="mt-5 overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-sm"><thead><tr><th>Date</th><th>Influence</th><th>{en?"Interest":"Interet"}</th><th>Position</th><th>Statut</th><th>{en?"Engagement strategy":"Strategie d engagement"}</th></tr></thead><tbody>{reviews.map(row=><tr key={row.id} className="border-t"><td className="p-3">{row.review_date}<small className="block">{row.reviewer_name}</small></td><td>{levelLabels[row.influence_level][locale]}</td><td>{levelLabels[row.interest_level][locale]}</td><td>{positionLabels[row.position][locale]}</td><td>{row.status}</td><td>{row.engagement_strategies.join(", ")}</td></tr>)}</tbody></table></div></div></div>}  </div>;
}
