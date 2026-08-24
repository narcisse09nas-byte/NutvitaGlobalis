"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Evaluation, EvaluationStatus, EvaluationType, Indicator, MealEntry, MealEntryStatus, PPMResource } from "@/lib/ppm/types";

const evaluationTypeLabels: Record<EvaluationType, { fr: string; en: string }> = { baseline: { fr: "Baseline", en: "Baseline" }, midline: { fr: "Midline", en: "Midline" }, endline: { fr: "Endline", en: "Endline" }, final: { fr: "Finale", en: "Final" }, ex_post: { fr: "Ex-post", en: "Ex-post" } };
const evaluationStatusLabels: Record<EvaluationStatus, { fr: string; en: string }> = { planned: { fr: "Planifiee", en: "Planned" }, ongoing: { fr: "En cours", en: "Ongoing" }, completed: { fr: "Terminee", en: "Completed" }, cancelled: { fr: "Annulee", en: "Cancelled" } };
const mealStatusLabels: Record<MealEntryStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" }, submitted: { fr: "Soumise", en: "Submitted" }, data_quality_review: { fr: "Revue qualite des donnees", en: "Data quality review" },
  validated: { fr: "Validee", en: "Validated" }, returned: { fr: "Retournee", en: "Returned" }, rejected: { fr: "Rejetee", en: "Rejected" },
};
const mealStatusTones: Record<MealEntryStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", data_quality_review: "bg-amber-50 text-amber-800",
  validated: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700",
};

export default function IndicatorTrackingManager({ projectId, indicators, initialEntries, initialEvaluations, staff = [] }: {
  projectId: string; indicators: Indicator[]; initialEntries: MealEntry[]; initialEvaluations: Evaluation[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [entries, setEntries] = useState(initialEntries);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [editingEntry, setEditingEntry] = useState<MealEntry | "new" | null>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | "new" | null>(null);
  const [entryIndicatorId, setEntryIndicatorId] = useState("");
  const [entryTargetValue, setEntryTargetValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const indicatorLabel = (id: string) => indicators.find(item => item.id === id)?.name || "—";

  // Refinement program, Wave 7 (item 40): the indicator's own target auto-fills this measurement's
  // target when the indicator is selected — still editable/overridable afterward.
  function openEntryEditor(row: MealEntry | "new") {
    setMessage("");
    setEntryIndicatorId(row !== "new" ? row.indicator_id : "");
    setEntryTargetValue(row !== "new" ? String(row.target_value ?? "") : "");
    setEditingEntry(row);
  }
  function handleIndicatorChange(indicatorId: string) {
    setEntryIndicatorId(indicatorId);
    const indicator = indicators.find(item => item.id === indicatorId);
    if (indicator?.target != null) setEntryTargetValue(String(indicator.target));
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      indicator_id: String(form.get("indicator_id") || ""),
      period_label: String(form.get("period_label") || "").trim(),
      period_start: String(form.get("period_start") || "") || null,
      period_end: String(form.get("period_end") || "") || null,
      target_value: form.get("target_value") ? Number(form.get("target_value")) : null,
      actual_value: form.get("actual_value") ? Number(form.get("actual_value")) : null,
      data_source: String(form.get("data_source") || "").trim() || null,
      collected_by_name: String(form.get("collected_by_name") || "").trim() || null,
      collection_date: String(form.get("collection_date") || "") || null,
      comments: String(form.get("comments") || "").trim() || null,
    };
    if (!payload.indicator_id || !payload.period_label) { setSaving(false); setMessage(en ? "Indicator and period are required." : "L'indicateur et la periode sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editingEntry === "new";
    const result = isNew
      ? await supabase.from("ppm_meal_entries").insert({ ...payload, status: "draft", created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_meal_entries").update({ ...payload, status: (editingEntry as MealEntry).status === "returned" ? "draft" : (editingEntry as MealEntry).status }).eq("id", (editingEntry as MealEntry).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setEntries(current => isNew ? [result.data as MealEntry, ...current] : current.map(row => row.id === result.data.id ? result.data as MealEntry : row));
    setEditingEntry(null);
  }

  async function advanceEntry(row: MealEntry, nextStatus: MealEntryStatus) {
    let reviewNote: string | null = null;
    if (nextStatus === "returned" || nextStatus === "rejected") {
      reviewNote = prompt(en ? "Comment (required):" : "Commentaire (obligatoire) :");
      if (!reviewNote) return;
    }
    const supabase = createClient();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "data_quality_review" || nextStatus === "validated" || nextStatus === "returned" || nextStatus === "rejected") { payload.reviewed_at = now; if (reviewNote) payload.review_note = reviewNote; }
    if (nextStatus === "validated") payload.validated_at = now;
    const result = await supabase.from("ppm_meal_entries").update(payload).eq("id", row.id).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    const updated = result.data as MealEntry;
    setEntries(current => current.map(item => item.id === updated.id ? updated : item));
    if (nextStatus === "validated" && updated.actual_value != null) {
      await supabase.from("ppm_indicators").update({ current_value: updated.actual_value }).eq("id", updated.indicator_id);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Indicateur valide — ${indicatorLabel(updated.indicator_id)}`, to_status: String(updated.actual_value), note: updated.period_label });
    }
  }

  async function submitEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      type: String(form.get("type") || "midline") as EvaluationType,
      title: String(form.get("title") || "").trim(),
      planned_date: String(form.get("planned_date") || "") || null,
      actual_date: String(form.get("actual_date") || "") || null,
      methodology: String(form.get("methodology") || "").trim() || null,
      key_findings: String(form.get("key_findings") || "").trim() || null,
      recommendations: String(form.get("recommendations") || "").trim() || null,
      status: String(form.get("status") || "planned") as EvaluationStatus,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editingEvaluation === "new";
    const result = isNew
      ? await supabase.from("ppm_evaluations").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_evaluations").update(payload).eq("id", (editingEvaluation as Evaluation).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setEvaluations(current => isNew ? [result.data as Evaluation, ...current] : current.map(row => row.id === result.data.id ? result.data as Evaluation : row));
    setEditingEvaluation(null);
  }

  return <div className="grid gap-8">
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Indicator tracking" : "Suivi des indicateurs"}</h2><button onClick={() => openEntryEditor("new")} disabled={!indicators.length} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New measurement" : "Nouvelle mesure"}</button></div>
      {!indicators.length && <p className="rounded-2xl border border-dashed bg-white p-5 text-sm text-slate-500">{en ? "First define indicators in the Result chain (Scoping tab) to be able to track their measurements here." : "Definissez d'abord des indicateurs dans le Cadre de resultats (onglet Cadrage) pour pouvoir suivre leurs mesures ici."}</p>}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Indicator" : "Indicateur"}</th><th className="p-4">{en ? "Period" : "Periode"}</th><th className="p-4">{en ? "Target" : "Cible"}</th><th className="p-4">{en ? "Actual" : "Realise"}</th><th className="p-4">{en ? "Source" : "Source"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
          <tbody>
            {entries.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4"><b className="text-forest">{indicatorLabel(row.indicator_id)}</b></td>
              <td className="p-4">{row.period_label}</td>
              <td className="p-4">{row.target_value ?? "—"}</td>
              <td className="p-4">{row.actual_value ?? "—"}</td>
              <td className="p-4">{row.data_source || "—"}</td>
              <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${mealStatusTones[row.status]}`}>{mealStatusLabels[row.status][locale]}</span></td>
              <td className="p-4"><div className="flex flex-wrap gap-2">
                {row.status === "draft" && <button onClick={() => openEntryEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button>}
                {row.status === "draft" && <button onClick={() => advanceEntry(row, "submitted")} className="btn-primary px-3 py-2 text-xs">{en ? "Submit" : "Soumettre"}</button>}
                {row.status === "submitted" && <button onClick={() => advanceEntry(row, "data_quality_review")} className="btn-secondary px-3 py-2 text-xs">{en ? "Quality review" : "Revue qualite"}</button>}
                {(row.status === "submitted" || row.status === "data_quality_review") && <>
                  <button onClick={() => advanceEntry(row, "validated")} className="btn-primary px-3 py-2 text-xs">{en ? "Validate" : "Valider"}</button>
                  <button onClick={() => advanceEntry(row, "returned")} className="btn-secondary px-3 py-2 text-xs">{en ? "Return" : "Retourner"}</button>
                  <button onClick={() => advanceEntry(row, "rejected")} className="btn-secondary px-3 py-2 text-xs">{en ? "Reject" : "Rejeter"}</button>
                </>}
                {row.status === "returned" && <button onClick={() => openEntryEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Correct" : "Corriger"}</button>}
              </div></td>
            </tr>)}
            {!entries.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No measurement recorded." : "Aucune mesure enregistree."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Evaluations" : "Evaluations"}</h2><button onClick={() => setEditingEvaluation("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New evaluation" : "Nouvelle evaluation"}</button></div>
      <div className="grid gap-3">
        {evaluations.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{evaluationTypeLabels[row.type][locale]}{row.planned_date ? ` · ${en ? "Planned on" : "Planifiee le"} ${new Date(row.planned_date).toLocaleDateString(en ? "en-US" : "fr-FR")}` : ""}</p></div>
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{evaluationStatusLabels[row.status][locale]}</span>
          </div>
          {row.key_findings && <p className="mt-2 text-sm text-slate-600"><b>{en ? "Findings:" : "Constats :"}</b> {row.key_findings}</p>}
          <button onClick={() => setEditingEvaluation(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button>
        </article>)}
        {!evaluations.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No evaluation recorded." : "Aucune evaluation enregistree."}</p>}
      </div>
    </div>

    {editingEntry && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitEntry} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editingEntry === "new" ? (en ? "New measurement" : "Nouvelle mesure") : (en ? "Edit measurement" : "Modifier la mesure")}</h2><button type="button" onClick={() => setEditingEntry(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Indicator" : "Indicateur"}<select name="indicator_id" value={entryIndicatorId} onChange={event => handleIndicatorChange(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{indicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Period (e.g. Q1 2026)" : "Periode (ex : T1 2026)"}<input name="period_label" defaultValue={editingEntry !== "new" ? editingEntry.period_label : ""} required className="admin-input" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Period start" : "Debut periode"}<input name="period_start" type="date" defaultValue={editingEntry !== "new" ? editingEntry.period_start || "" : ""} className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Period end" : "Fin periode"}<input name="period_end" type="date" defaultValue={editingEntry !== "new" ? editingEntry.period_end || "" : ""} className="admin-input" /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Target value" : "Valeur cible"}<input name="target_value" type="number" step="0.01" value={entryTargetValue} onChange={event => setEntryTargetValue(event.target.value)} className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Actual value" : "Valeur realisee"}<input name="actual_value" type="number" step="0.01" defaultValue={editingEntry !== "new" ? editingEntry.actual_value ?? "" : ""} className="admin-input" /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Data source" : "Source de donnees"}<input name="data_source" defaultValue={editingEntry !== "new" ? editingEntry.data_source || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Collected by" : "Collecte par"}<SearchableSelect name="collected_by_name" options={staffOptions} defaultValue={editingEntry !== "new" ? editingEntry.collected_by_name || "" : ""} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Collection date" : "Date de collecte"}<input name="collection_date" type="date" defaultValue={editingEntry !== "new" ? editingEntry.collection_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Comments" : "Commentaires"}<textarea name="comments" rows={2} defaultValue={editingEntry !== "new" ? editingEntry.comments || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingEntry(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {editingEvaluation && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitEvaluation} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editingEvaluation === "new" ? (en ? "New evaluation" : "Nouvelle evaluation") : (en ? "Edit evaluation" : "Modifier l'evaluation")}</h2><button type="button" onClick={() => setEditingEvaluation(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editingEvaluation !== "new" ? editingEvaluation.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Type" : "Type"}<select name="type" defaultValue={editingEvaluation !== "new" ? editingEvaluation.type : "midline"} className="admin-input">{Object.entries(evaluationTypeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editingEvaluation !== "new" ? editingEvaluation.status : "planned"} className="admin-input">{Object.entries(evaluationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Planned date" : "Date planifiee"}<input name="planned_date" type="date" defaultValue={editingEvaluation !== "new" ? editingEvaluation.planned_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Actual date" : "Date reelle"}<input name="actual_date" type="date" defaultValue={editingEvaluation !== "new" ? editingEvaluation.actual_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Methodology" : "Methodologie"}<textarea name="methodology" rows={2} defaultValue={editingEvaluation !== "new" ? editingEvaluation.methodology || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Key findings" : "Constats cles"}<textarea name="key_findings" rows={2} defaultValue={editingEvaluation !== "new" ? editingEvaluation.key_findings || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Recommendations" : "Recommandations"}<textarea name="recommendations" rows={2} defaultValue={editingEvaluation !== "new" ? editingEvaluation.recommendations || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditingEvaluation(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
