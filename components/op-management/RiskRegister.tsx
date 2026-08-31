"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMResource, Risk, RiskResponseStrategy, RiskReview, RiskStatus } from "@/lib/ppm/types";

const responseLabels: Record<RiskResponseStrategy, { fr: string; en: string }> = { avoid: { fr: "Eviter", en: "Avoid" }, mitigate: { fr: "Attenuer", en: "Mitigate" }, transfer: { fr: "Transferer", en: "Transfer" }, accept: { fr: "Accepter", en: "Accept" } };
const statusLabels: Record<RiskStatus, { fr: string; en: string }> = { open: { fr: "Ouvert", en: "Open" }, monitoring: { fr: "Sous surveillance", en: "Monitoring" }, closed: { fr: "Cloture", en: "Closed" } };
const riskCategories=["strategic","operational","financial","technical","legal_compliance","security","environmental_social","external"];
const riskCauses=["planning","resources","budget","supplier","technical","governance","regulatory","environment","security"];
const riskEvents=["delay","cost_overrun","quality_failure","service_interruption","non_compliance","loss_damage","safety_incident","target_not_met"];
const labelOption=(value:string,en:boolean)=>({strategic:en?"Strategic":"Strategique",operational:en?"Operational":"Operationnelle",financial:en?"Financial":"Financiere",technical:en?"Technical":"Technique",legal_compliance:en?"Legal / compliance":"Juridique / conformite",security:en?"Security":"Securite",environmental_social:en?"Environmental / social":"Environnementale / sociale",external:en?"External":"Externe",planning:en?"Planning":"Planification",resources:en?"Resources":"Ressources",budget:en?"Budget":"Budget",supplier:en?"Supplier":"Fournisseur",governance:en?"Governance":"Gouvernance",regulatory:en?"Regulatory":"Reglementaire",environment:en?"Environment":"Environnement",delay:en?"Delay":"Retard",cost_overrun:en?"Cost overrun":"Depassement de cout",quality_failure:en?"Quality failure":"Defaut de qualite",service_interruption:en?"Service interruption":"Interruption de service",non_compliance:en?"Non-compliance":"Non-conformite",loss_damage:en?"Loss / damage":"Perte / dommage",safety_incident:en?"Safety incident":"Incident de securite",target_not_met:en?"Target not met":"Cible non atteinte"} as Record<string,string>)[value]||value;

function levelFor(score: number, en: boolean) {
  if (score >= 20) return { label: en ? "Critical" : "Critique", tone: "bg-red-100 text-red-800" };
  if (score >= 12) return { label: en ? "High" : "Eleve", tone: "bg-amber-50 text-amber-800" };
  if (score >= 6) return { label: en ? "Moderate" : "Modere", tone: "bg-sky-50 text-sky-800" };
  return { label: en ? "Low" : "Faible", tone: "bg-mint text-forest" };
}

export default function RiskRegister({ projectId, initial, initialReviews, staff = [] }: {
  projectId: string; initial: Risk[]; initialReviews: RiskReview[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [reviews, setReviews] = useState(initialReviews);
  const [editing, setEditing] = useState<Risk | "new" | null>(null);
  const [reviewing, setReviewing] = useState<Risk | null>(null);
  const [historyFor, setHistoryFor] = useState<Risk | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [categoryChoice,setCategoryChoice]=useState(""); const [causeChoice,setCauseChoice]=useState(""); const [eventChoice,setEventChoice]=useState("");
  function openEditor(row:Risk|"new"){const choice=(value:string|undefined,options:string[])=>value?(options.includes(value)?value:"other"):"";setCategoryChoice(row==="new"?"":choice(row.category,riskCategories));setCauseChoice(row==="new"?"":choice(row.cause,riskCauses));setEventChoice(row==="new"?"":choice(row.event,riskEvents));setEditing(row);}

  // Refinement program, Wave 6 (item 35): a periodic review register — each review re-assesses
  // probability/impact and can close the risk, keeping full history via ppm_risk_reviews instead
  // of only the risk's current snapshot.
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewing) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      risk_id: reviewing.id,
      review_date: String(form.get("review_date") || new Date().toISOString().slice(0, 10)),
      reviewer_name: String(form.get("reviewer_name") || "").trim() || null,
      probability: Number(form.get("probability") || reviewing.probability),
      impact: Number(form.get("impact") || reviewing.impact),
      status_after: String(form.get("status_after") || reviewing.status) as RiskStatus,
      response_strategy: String(form.get("response_strategy") || reviewing.response_strategy || "") as RiskResponseStrategy || null,
      owner_name: String(form.get("owner_name") || reviewing.owner_name || "").trim() || null,
      action: String(form.get("action") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_risk_reviews").insert({ ...payload, created_by: user?.id }).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    setReviews(current => [result.data as RiskReview, ...current]);
    const updated = await supabase.from("ppm_risks").update({ probability: payload.probability, impact: payload.impact, status: payload.status_after, response_strategy: payload.response_strategy, owner_name: payload.owner_name }).eq("id", reviewing.id).select("*").single();
    if (!updated.error) {
      setRows(current => current.map(row => row.id === reviewing.id ? updated.data as Risk : row));
      await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Risque revise — ${reviewing.title}`, from_status: reviewing.status, to_status: payload.status_after, note: payload.notes || undefined });
    }
    setReviewing(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      code: editing && editing !== "new" ? editing.code || null : null,
      title: String(form.get("title") || "").trim(),
      category: String(form.get("category_choice") || "") === "other" ? String(form.get("category_other") || "").trim() || null : String(form.get("category_choice") || "").trim() || null,
      cause: String(form.get("cause_choice") || "") === "other" ? String(form.get("cause_other") || "").trim() || null : String(form.get("cause_choice") || "").trim() || null,
      event: String(form.get("event_choice") || "") === "other" ? String(form.get("event_other") || "").trim() || null : String(form.get("event_choice") || "").trim() || null,
      consequence: String(form.get("consequence") || "").trim() || null,
      probability: Number(form.get("probability") || 3),
      impact: Number(form.get("impact") || 3),
      owner_name: String(form.get("owner_name") || "").trim() || null,
      response_strategy: String(form.get("response_strategy") || "") as RiskResponseStrategy || null,
      mitigation_plan: String(form.get("mitigation_plan") || "").trim() || null,
      deadline: String(form.get("deadline") || "") || null,
      cost: form.get("cost") ? Number(form.get("cost")) : null,
      currency: String(form.get("currency") || "XAF"),
      residual_probability: form.get("residual_probability") ? Number(form.get("residual_probability")) : null,
      residual_impact: form.get("residual_impact") ? Number(form.get("residual_impact")) : null,
      status: String(form.get("status") || "open") as RiskStatus,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_risks").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_risks").update(payload).eq("id", (editing as Risk).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Risk, ...current] : current.map(row => row.id === result.data.id ? result.data as Risk : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Risk register" : "Registre des risques"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New risk" : "Nouveau risque"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">{en ? "Risk" : "Risque"}</th><th className="p-4">{en ? "Category" : "Categorie"}</th><th className="p-4">P × I = Score</th><th className="p-4">{en ? "Level" : "Niveau"}</th><th className="p-4">{en ? "Response" : "Reponse"}</th><th className="p-4">{en ? "Owner" : "Proprietaire"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => { const score = row.probability * row.impact; const level = levelFor(score, en); return <tr key={row.id} className="border-t align-top">
            <td className="p-4 font-mono text-xs font-bold text-forest">{row.code || row.id.slice(0,8)}</td><td className="p-4"><b className="text-forest">{row.title}</b></td>
            <td className="p-4">{row.category || "—"}</td>
            <td className="p-4">{row.probability} × {row.impact} = {score}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${level.tone}`}>{level.label}</span></td>
            <td className="p-4">{row.response_strategy ? responseLabels[row.response_strategy][locale] : "—"}</td>
            <td className="p-4">{row.owner_name || "—"}</td>
            <td className="p-4">{statusLabels[row.status][locale]}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button>
              {row.status !== "closed" && <button onClick={() => setReviewing(row)} className="btn-primary px-3 py-2 text-xs">{en ? "Review" : "Reviser"}</button>}
              {reviews.some(item => item.risk_id === row.id) && <button onClick={() => setHistoryFor(row)} className="text-xs font-bold text-slate-400 underline">{en ? "History" : "Historique"}</button>}
            </div></td>
          </tr>; })}
          {!rows.length && <tr><td colSpan={9} className="p-10 text-center text-slate-400">{en ? "No risk recorded." : "Aucun risque enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New risk" : "Nouveau risque") : (en ? "Edit risk" : "Modifier le risque")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">ID<input value={editing !== "new" ? editing.code || "" : (en ? "Generated automatically" : "Genere automatiquement")} disabled className="admin-input bg-slate-100" /></label>
          <div className="grid gap-2"><label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category_choice" value={categoryChoice} onChange={e=>setCategoryChoice(e.target.value)} className="admin-input"><option value="">-</option>{riskCategories.map(v=><option key={v} value={v}>{labelOption(v,en)}</option>)}<option value="other">{en?"Other (specify)":"Autre a preciser"}</option></select></label>{categoryChoice==="other"&&<input name="category_other" defaultValue={editing!=="new"&&!riskCategories.includes(editing.category||"")?editing.category||"":""} required className="admin-input"/>}</div>
          <div className="grid gap-2"><label className="grid gap-2 text-sm font-bold">{en?"Cause":"Cause"}<select name="cause_choice" value={causeChoice} onChange={e=>setCauseChoice(e.target.value)} className="admin-input"><option value="">-</option>{riskCauses.map(v=><option key={v} value={v}>{labelOption(v,en)}</option>)}<option value="other">{en?"Other (specify)":"Autre a preciser"}</option></select></label>{causeChoice==="other"&&<input name="cause_other" defaultValue={editing!=="new"&&!riskCauses.includes(editing.cause||"")?editing.cause||"":""} required className="admin-input"/>}</div>
          <div className="grid gap-2"><label className="grid gap-2 text-sm font-bold">{en?"Event":"Evenement"}<select name="event_choice" value={eventChoice} onChange={e=>setEventChoice(e.target.value)} className="admin-input"><option value="">-</option>{riskEvents.map(v=><option key={v} value={v}>{labelOption(v,en)}</option>)}<option value="other">{en?"Other (specify)":"Autre a preciser"}</option></select></label>{eventChoice==="other"&&<input name="event_other" defaultValue={editing!=="new"&&!riskEvents.includes(editing.event||"")?editing.event||"":""} required className="admin-input"/>}</div>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Consequence" : "Consequence"}<textarea name="consequence" rows={2} defaultValue={editing !== "new" ? editing.consequence || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Probability (1-5)" : "Probabilite (1-5)"}<input name="probability" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.probability : 3} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Impact (1-5)<input name="impact" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.impact : 3} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Owner" : "Proprietaire"}<SearchableSelect name="owner_name" options={staffOptions} defaultValue={editing !== "new" ? editing.owner_name || "" : ""} allowOther otherLabel={en ? "Owner name" : "Nom du proprietaire"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Response strategy" : "Strategie de reponse"}<select name="response_strategy" defaultValue={editing !== "new" ? editing.response_strategy || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(responseLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Mitigation plan" : "Plan d'attenuation"}<textarea name="mitigation_plan" rows={2} defaultValue={editing !== "new" ? editing.mitigation_plan || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="deadline" type="date" defaultValue={editing !== "new" ? editing.deadline || "" : ""} className="admin-input" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold">{en ? "Cost" : "Cout"}<input name="cost" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.cost ?? "" : ""} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">{en?"Currency":"Devise"}<input name="currency" defaultValue={editing!=="new"?editing.currency||"XAF":"XAF"} className="admin-input"/></label></div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Residual probability" : "Probabilite residuelle"}<input name="residual_probability" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.residual_probability ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Residual impact" : "Impact residuel"}<input name="residual_impact" type="number" min="1" max="5" defaultValue={editing !== "new" ? editing.residual_impact ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "open"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {reviewing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitReview} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Review" : "Reviser"} — {reviewing.title}</h2><button type="button" onClick={() => setReviewing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Review date" : "Date de revue"}<input name="review_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Reviewed by" : "Revu par"}<SearchableSelect name="reviewer_name" options={staffOptions} allowOther otherLabel={en ? "Reviewer name" : "Nom du reviseur"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Probability (1-5)" : "Probabilite (1-5)"}<input name="probability" type="number" min="1" max="5" defaultValue={reviewing.probability} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Impact (1-5)<input name="impact" type="number" min="1" max="5" defaultValue={reviewing.impact} className="admin-input" /></label>
<label className="grid gap-2 text-sm font-bold">{en?"Response":"Reponse"}<select name="response_strategy" defaultValue={reviewing.response_strategy||""} className="admin-input"><option value="">-</option>{Object.entries(responseLabels).map(([value,label])=><option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en?"Owner":"Proprietaire"}<SearchableSelect name="owner_name" options={staffOptions} defaultValue={reviewing.owner_name||""} allowOther otherLabel={en?"Owner name":"Nom du proprietaire"}/></label>
                    <label className="grid gap-2 text-sm font-bold">{en ? "Status after review" : "Statut apres revue"}<select name="status_after" defaultValue={reviewing.status} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setReviewing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Save the review" : "Enregistrer la revue"}</button></div>
          <label className="grid gap-2 text-sm font-bold">{en?"Action":"Action"}<textarea name="action" rows={2} required className="admin-input"/></label>
        </div>
      </form>
    </div>}

    {historyFor && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><div className="mx-auto my-10 max-w-6xl rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Review history" : "Historique des revues"} — {historyFor.title}</h2><button onClick={() => setHistoryFor(null)}><XMarkIcon className="h-6" /></button></div><div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">P × I = Score</th><th className="p-3">{en ? "Level" : "Niveau"}</th><th className="p-3">{en ? "Response" : "Reponse"}</th><th className="p-3">{en ? "Owner" : "Proprietaire"}</th><th className="p-3">{en ? "Status" : "Statut"}</th><th className="p-3">Action</th></tr></thead><tbody>{reviews.filter(item => item.risk_id === historyFor.id).map(item => { const score = item.probability * item.impact; const level = levelFor(score, en); return <tr key={item.id} className="border-t"><td className="p-3">{new Date(item.review_date).toLocaleDateString(en ? "en-US" : "fr-FR")}<small className="block text-slate-400">{item.reviewer_name}</small></td><td className="p-3">{item.probability} × {item.impact} = {score}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${level.tone}`}>{level.label}</span></td><td className="p-3">{item.response_strategy ? responseLabels[item.response_strategy][locale] : "-"}</td><td className="p-3">{item.owner_name || "-"}</td><td className="p-3">{statusLabels[item.status_after][locale]}</td><td className="p-3">{item.action || item.notes || "-"}</td></tr>; })}</tbody></table></div></div></div>}  </div>;
}
