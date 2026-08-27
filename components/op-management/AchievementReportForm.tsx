"use client";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  Achievement, AchievementEvidence, AchievementStatus, AchievementType, Activity,
  BeneficiaryBreakdownEntry, DifficultyCategory, DifficultySeverity, EvidenceCategory,
  Indicator, ProgressMethod, ResultChainNode, WBSNode,
} from "@/lib/ppm/types";

const typeLabels: Record<AchievementType, { fr: string; en: string }> = {
  training: { fr: "Formation", en: "Training" }, sensitization: { fr: "Sensibilisation", en: "Sensitization" }, distribution: { fr: "Distribution", en: "Distribution" },
  supervision: { fr: "Supervision", en: "Supervision" }, meeting: { fr: "Reunion", en: "Meeting" }, mission: { fr: "Mission", en: "Mission" }, data_collection: { fr: "Collecte de donnees", en: "Data collection" },
  service_delivery: { fr: "Prestation", en: "Service delivery" }, construction: { fr: "Construction", en: "Construction" }, documentation: { fr: "Production documentaire", en: "Documentation" }, other: { fr: "Autre", en: "Other" },
};
const methodLabels: Record<ProgressMethod, { fr: string; en: string }> = { quantitative: { fr: "Quantitative", en: "Quantitative" }, milestones: { fr: "Etapes (milestones)", en: "Milestones" }, manual: { fr: "Estimation manuelle", en: "Manual estimate" } };
const difficultyCategoryLabels: Record<DifficultyCategory, { fr: string; en: string }> = {
  technical: { fr: "Technique", en: "Technical" }, logistics: { fr: "Logistique", en: "Logistics" }, financial: { fr: "Financiere", en: "Financial" }, hr: { fr: "Ressources humaines", en: "Human resources" },
  procurement: { fr: "Procurement", en: "Procurement" }, security: { fr: "Securite", en: "Security" }, partner: { fr: "Partenaire", en: "Partner" }, community: { fr: "Communaute", en: "Community" },
  environment: { fr: "Environnement", en: "Environment" }, weather: { fr: "Meteo", en: "Weather" }, other: { fr: "Autre", en: "Other" },
};
const severityLabels: Record<DifficultySeverity, { fr: string; en: string }> = { low: { fr: "Faible", en: "Low" }, medium: { fr: "Moyenne", en: "Medium" }, high: { fr: "Elevee", en: "High" }, critical: { fr: "Critique", en: "Critical" } };
const evidenceCategoryLabels: Record<EvidenceCategory, { fr: string; en: string }> = {
  report: { fr: "Rapport", en: "Report" }, photo: { fr: "Photo", en: "Photo" }, attendance_list: { fr: "Liste de presence", en: "Attendance list" }, minutes: { fr: "PV", en: "Minutes" }, dataset: { fr: "Dataset", en: "Dataset" },
  form: { fr: "Formulaire", en: "Form" }, gps: { fr: "GPS", en: "GPS" }, video: { fr: "Video", en: "Video" }, document: { fr: "Document", en: "Document" }, url: { fr: "URL", en: "URL" }, other: { fr: "Autre", en: "Other" },
};
const suggestedBreakdownCategoriesFr = ["Sexe", "Age", "Handicap", "Statut", "Zone"];
const suggestedBreakdownCategoriesEn = ["Sex", "Age", "Disability", "Status", "Zone"];

function round1(value: number) { return Math.round(value * 10) / 10; }

export default function AchievementReportForm({ projectId, activity, workPackage, output, indicator, previousAchievements, editing, initialEvidence, onClose, onSaved }: {
  projectId: string; activity: Activity; workPackage?: WBSNode; output?: ResultChainNode; indicator?: Indicator;
  previousAchievements: Achievement[]; editing: Achievement | "new"; initialEvidence: AchievementEvidence[];
  onClose: () => void; onSaved: (row: Achievement) => void;
}) {
  const { locale, en } = usePpmLocale();
  const isNewInitially = editing === "new";
  const formRef = useRef<HTMLFormElement>(null);
  const [achievementId, setAchievementId] = useState<string | null>(isNewInitially ? null : (editing as Achievement).id);
  const [method, setMethod] = useState<ProgressMethod>(isNewInitially ? "manual" : (editing as Achievement).progress_method);
  const [periodAchieved, setPeriodAchieved] = useState(isNewInitially ? "" : String((editing as Achievement).period_achieved ?? ""));
  const [targetValue, setTargetValue] = useState(isNewInitially ? (indicator?.target != null ? String(indicator.target) : "") : String((editing as Achievement).target_value ?? ""));
  const [milestonesPlanned, setMilestonesPlanned] = useState(isNewInitially ? "" : String((editing as Achievement).milestones_planned ?? ""));
  const [milestonesCompleted, setMilestonesCompleted] = useState(isNewInitially ? "" : String((editing as Achievement).milestones_completed ?? ""));
  const [manualPercent, setManualPercent] = useState(isNewInitially ? "" : String((editing as Achievement).manual_progress_percent ?? ""));
  const [breakdown, setBreakdown] = useState<BeneficiaryBreakdownEntry[]>(isNewInitially ? [] : (editing as Achievement).beneficiaries_breakdown || []);
  const [difficultyEncountered, setDifficultyEncountered] = useState(isNewInitially ? false : (editing as Achievement).difficulty_encountered);
  const [linkedIssueId, setLinkedIssueId] = useState<string | null>(isNewInitially ? null : (editing as Achievement).linked_issue_id ?? null);
  const [linkedRiskId, setLinkedRiskId] = useState<string | null>(isNewInitially ? null : (editing as Achievement).linked_risk_id ?? null);
  const [managementDecisionRequired, setManagementDecisionRequired] = useState(isNewInitially ? false : (editing as Achievement).management_decision_required);
  const [evidence, setEvidence] = useState<AchievementEvidence[]>(initialEvidence);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const previousValidatedCumulative = useMemo(() => previousAchievements
    .filter(item => item.status === "validated" && item.progress_method === "quantitative")
    .reduce((sum, item) => sum + Number(item.period_achieved || 0), 0), [previousAchievements]);

  const proposedCumulative = previousValidatedCumulative + Number(periodAchieved || 0);
  const computedPercent = useMemo(() => {
    if (method === "quantitative") { const target = Number(targetValue || 0); return target > 0 ? round1(Math.min(100, (proposedCumulative / target) * 100)) : 0; }
    if (method === "milestones") { const planned = Number(milestonesPlanned || 0); return planned > 0 ? round1(Math.min(100, (Number(milestonesCompleted || 0) / planned) * 100)) : 0; }
    return Number(manualPercent || 0);
  }, [method, targetValue, proposedCumulative, milestonesPlanned, milestonesCompleted, manualPercent]);

  const suggestedBreakdownCategories = en ? suggestedBreakdownCategoriesEn : suggestedBreakdownCategoriesFr;
  function addBreakdownRow(category = "") { setBreakdown(current => [...current, { category, label: "", value: 0 }]); }
  function updateBreakdownRow(index: number, patch: Partial<BeneficiaryBreakdownEntry>) {
    setBreakdown(current => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
  function removeBreakdownRow(index: number) { setBreakdown(current => current.filter((_, i) => i !== index)); }

  async function createLinkedIssue() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_issues").insert({
      project_id: projectId, work_package_id: activity.work_package_id, activity_id: activity.id,
      title: `Issue — ${activity.title}`, priority: "medium", status: "open", created_by: user?.id,
    }).select("id").single();
    if (!result.error) setLinkedIssueId(result.data.id);
  }

  async function createLinkedRisk() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_risks").insert({
      project_id: projectId, work_package_id: activity.work_package_id,
      title: `Risque — ${activity.title}`, probability: 3, impact: 3, status: "open", created_by: user?.id,
    }).select("id").single();
    if (!result.error) setLinkedRiskId(result.data.id);
  }

  async function save(nextStatus: AchievementStatus) {
    if (!formRef.current) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(formRef.current);
    if (method === "manual" && !String(form.get("manual_justification") || "").trim()) {
      setSaving(false); setMessage(en ? "A justification is required for a manual estimate." : "Une justification est obligatoire pour une estimation manuelle."); return;
    }
    const payload = {
      project_id: projectId,
      activity_id: activity.id,
      code: achievementId ? (editing !== "new" ? editing.code : undefined) : `ACH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${previousAchievements.length + 1}`,
      period_label: String(form.get("period_label") || "").trim() || null,
      achievement_date: String(form.get("achievement_date") || "") || null,
      location: String(form.get("location") || "").trim() || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      achievement_type: String(form.get("achievement_type") || "") as AchievementType || null,
      actual_start: String(form.get("actual_start") || "") || null,
      actual_end: String(form.get("actual_end") || "") || null,
      partners_involved: String(form.get("partners_involved") || "").trim() || null,
      progress_method: method,
      target_value: method === "quantitative" ? Number(targetValue || 0) : null,
      previous_validated_cumulative: method === "quantitative" ? previousValidatedCumulative : null,
      period_achieved: method === "quantitative" ? Number(periodAchieved || 0) : null,
      proposed_cumulative: method === "quantitative" ? proposedCumulative : null,
      milestones_planned: method === "milestones" ? Number(milestonesPlanned || 0) : null,
      milestones_completed: method === "milestones" ? Number(milestonesCompleted || 0) : null,
      manual_progress_percent: method === "manual" ? Number(manualPercent || 0) : null,
      manual_justification: method === "manual" ? String(form.get("manual_justification") || "").trim() || null : null,
      progress_percent: computedPercent,
      beneficiaries_period: form.get("beneficiaries_period") ? Number(form.get("beneficiaries_period")) : null,
      beneficiaries_cumulative: form.get("beneficiaries_cumulative") ? Number(form.get("beneficiaries_cumulative")) : null,
      beneficiaries_breakdown: breakdown.filter(row => row.category || row.label),
      indicator_id: indicator?.id || null,
      indicator_contribution: form.get("indicator_contribution") ? Number(form.get("indicator_contribution")) : null,
      indicator_contribution_note: String(form.get("indicator_contribution_note") || "").trim() || null,
      difficulty_encountered: difficultyEncountered,
      difficulty_category: difficultyEncountered ? (String(form.get("difficulty_category") || "") as DifficultyCategory || null) : null,
      difficulty_description: difficultyEncountered ? String(form.get("difficulty_description") || "").trim() || null : null,
      difficulty_severity: difficultyEncountered ? (String(form.get("difficulty_severity") || "") as DifficultySeverity || null) : null,
      difficulty_cause: difficultyEncountered ? String(form.get("difficulty_cause") || "").trim() || null : null,
      difficulty_impact: difficultyEncountered ? String(form.get("difficulty_impact") || "").trim() || null : null,
      variance_note: difficultyEncountered ? String(form.get("variance_note") || "").trim() || null : null,
      corrective_action: difficultyEncountered ? String(form.get("corrective_action") || "").trim() || null : null,
      corrective_action_responsible: difficultyEncountered ? String(form.get("corrective_action_responsible") || "").trim() || null : null,
      corrective_action_deadline: difficultyEncountered ? String(form.get("corrective_action_deadline") || "") || null : null,
      support_required: difficultyEncountered ? String(form.get("support_required") || "").trim() || null : null,
      linked_issue_id: linkedIssueId,
      linked_risk_id: linkedRiskId,
      next_steps: String(form.get("next_steps") || "").trim() || null,
      next_steps_responsible: String(form.get("next_steps_responsible") || "").trim() || null,
      next_steps_deadline: String(form.get("next_steps_deadline") || "") || null,
      next_steps_support: String(form.get("next_steps_support") || "").trim() || null,
      management_decision_required: managementDecisionRequired,
      management_decision_requested: managementDecisionRequired ? String(form.get("management_decision_requested") || "").trim() || null : null,
      management_decision_authority: managementDecisionRequired ? String(form.get("management_decision_authority") || "").trim() || null : null,
      management_decision_deadline: managementDecisionRequired ? String(form.get("management_decision_deadline") || "") || null : null,
      status: nextStatus,
      submitted_at: nextStatus === "submitted" ? new Date().toISOString() : (editing !== "new" ? editing.submitted_at : null) || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = achievementId
      ? await supabase.from("ppm_achievements").update(payload).eq("id", achievementId).select("*").single()
      : await supabase.from("ppm_achievements").insert({ ...payload, created_by: user?.id, created_by_email: user?.email }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as Achievement;
    setAchievementId(saved.id);
    if (nextStatus === "submitted") onSaved(saved);
    else { onSaved(saved); setMessage(en ? "Draft saved. You can add evidence below." : "Brouillon enregistre. Vous pouvez ajouter des preuves ci-dessous."); }
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !achievementId) return;
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/achievements/${achievementId}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) { setMessage(upload.error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_achievement_evidence").insert({
      achievement_id: achievementId, title: file.name, category: "document", file_path: path, created_by: user?.id,
    }).select("*").single();
    if (!result.error) setEvidence(current => [result.data as AchievementEvidence, ...current]);
  }

  async function viewEvidence(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  // Refinement program, Wave 4 (item 32): evidence can be replaced/deleted before submission —
  // restricted to draft, same pattern as ExpenseManager.tsx, so a submitted achievement's audit
  // trail stays intact.
  async function deleteEvidence(item: AchievementEvidence) {
    if (!confirm(en ? "Delete this piece of evidence?" : "Supprimer cette preuve ?")) return;
    const supabase = createClient();
    if (item.file_path) await supabase.storage.from("document-vault").remove([item.file_path]);
    const result = await supabase.from("ppm_achievement_evidence").delete().eq("id", item.id);
    if (!result.error) setEvidence(evidence.filter(row => row.id !== item.id));
  }

  const isDraftStatus = isNewInitially || (editing as Achievement).status === "draft";
  const showBeneficiaries = activity.beneficiaries != null && activity.beneficiaries > 0;

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <form ref={formRef} onSubmit={event => event.preventDefault()} className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "Report an achievement" : "Rapporter une realisation"}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>

      <section className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p><b className="text-forest">{activity.title}</b>{workPackage && ` · ${workPackage.title}`}{output && ` · Output : ${output.title}`}</p>
        <p className="mt-1 text-xs text-slate-400">{en ? "Responsible" : "Responsable"} : {activity.responsible_name || "—"}{indicator && ` · ${en ? "Indicator" : "Indicateur"} : ${indicator.name} (${en ? "target" : "cible"} ${indicator.target ?? "—"})`}</p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Identification" : "Identification"}</h3>
        <label className="grid gap-2 text-sm font-bold">{en ? "Reporting period" : "Periode de rapportage"}<input name="period_label" defaultValue={editing !== "new" ? editing.period_label || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Achievement date" : "Date de realisation"}<input name="achievement_date" type="date" defaultValue={editing !== "new" ? editing.achievement_date || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Actual location" : "Localisation reelle"}<input name="location" defaultValue={editing !== "new" ? editing.location || "" : activity.location || ""} className="admin-input" /></label>

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Achievement" : "Realisation"}</h3>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title / summary" : "Titre / resume"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Detailed description" : "Description detaillee"}<textarea name="description" rows={3} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Achievement type" : "Type de realisation"}<select name="achievement_type" defaultValue={editing !== "new" ? editing.achievement_type || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Partners involved" : "Partenaires impliques"}<input name="partners_involved" defaultValue={editing !== "new" ? editing.partners_involved || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Actual start date" : "Date reelle debut"}<input name="actual_start" type="date" defaultValue={editing !== "new" ? editing.actual_start || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Actual end date" : "Date reelle fin"}<input name="actual_end" type="date" defaultValue={editing !== "new" ? editing.actual_end || "" : ""} className="admin-input" /></label>

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Progress" : "Progression"}</h3>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {Object.entries(methodLabels).map(([value, label]) => <button key={value} type="button" onClick={() => setMethod(value as ProgressMethod)} className={`rounded-full px-4 py-2 text-xs font-bold ${method === value ? "bg-forest text-white" : "bg-slate-100 text-slate-600"}`}>{label[locale]}</button>)}
        </div>
        {method === "quantitative" && <>
          <label className="grid gap-2 text-sm font-bold">{en ? "Target" : "Cible"}<input type="number" step="0.01" value={targetValue} onChange={event => setTargetValue(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Already validated (cumulative)" : "Deja valide (cumul)"}<input value={previousValidatedCumulative} disabled className="admin-input bg-slate-50" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Achieved this period" : "Realise cette periode"}<input type="number" step="0.01" value={periodAchieved} onChange={event => setPeriodAchieved(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Proposed cumulative" : "Cumul propose"}<input value={proposedCumulative} disabled className="admin-input bg-slate-50" /></label>
        </>}
        {method === "milestones" && <>
          <label className="grid gap-2 text-sm font-bold">{en ? "Milestones planned" : "Etapes prevues"}<input type="number" min="0" value={milestonesPlanned} onChange={event => setMilestonesPlanned(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Milestones completed" : "Etapes terminees"}<input type="number" min="0" value={milestonesCompleted} onChange={event => setMilestonesCompleted(event.target.value)} className="admin-input" /></label>
        </>}
        {method === "manual" && <>
          <label className="grid gap-2 text-sm font-bold">{en ? "Estimated progress (%)" : "Progression estimee (%)"}<input type="number" min="0" max="100" value={manualPercent} onChange={event => setManualPercent(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Justification" : "Justification"}<textarea name="manual_justification" rows={2} defaultValue={editing !== "new" ? editing.manual_justification || "" : ""} className="admin-input" /></label>
        </>}
        <p className="rounded-xl bg-mint px-4 py-3 text-sm font-bold text-forest sm:col-span-2">{en ? "Computed progress" : "Progression calculee"} : {computedPercent}%</p>

        {showBeneficiaries && <>
          <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Beneficiaries" : "Beneficiaires"}</h3>
          <label className="grid gap-2 text-sm font-bold">{en ? "Reached this period" : "Atteints cette periode"}<input name="beneficiaries_period" type="number" min="0" defaultValue={editing !== "new" ? editing.beneficiaries_period ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Cumulative" : "Cumul"}<input name="beneficiaries_cumulative" type="number" min="0" defaultValue={editing !== "new" ? editing.beneficiaries_cumulative ?? "" : ""} className="admin-input" /></label>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">{suggestedBreakdownCategories.map(category => <button key={category} type="button" onClick={() => addBreakdownRow(category)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-mint">+ {category}</button>)}<button type="button" onClick={() => addBreakdownRow()} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-mint">+ {en ? "Other breakdown" : "Autre desagregation"}</button></div>
            <div className="mt-2 grid gap-2">
              {breakdown.map((row, index) => <div key={index} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2">
                <input placeholder={en ? "Category" : "Categorie"} value={row.category} onChange={event => updateBreakdownRow(index, { category: event.target.value })} className="admin-input" />
                <input placeholder={en ? "Value (e.g. Female)" : "Valeur (ex: Femme)"} value={row.label} onChange={event => updateBreakdownRow(index, { label: event.target.value })} className="admin-input" />
                <input type="number" min="0" value={row.value} onChange={event => updateBreakdownRow(index, { value: Number(event.target.value) })} className="admin-input" />
                <button type="button" onClick={() => removeBreakdownRow(index)} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-5 text-red-600" /></button>
              </div>)}
            </div>
          </div>
        </>}

        {indicator && <>
          <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Contribution to the indicator (proposal — will be reviewed by MEAL)" : "Contribution a l'indicateur (proposition — sera revue par MEAL)"}</h3>
          <p className="text-sm text-slate-500 sm:col-span-2">{indicator.name} — {en ? "target" : "cible"} {indicator.target ?? "—"} · {en ? "current validated value" : "valeur validee actuelle"} {indicator.current_value ?? "—"}</p>
          <label className="grid gap-2 text-sm font-bold">{en ? "Proposed contribution" : "Contribution proposee"}<input name="indicator_contribution" type="number" step="0.01" defaultValue={editing !== "new" ? editing.indicator_contribution ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Note" : "Note"}<input name="indicator_contribution_note" defaultValue={editing !== "new" ? editing.indicator_contribution_note || "" : ""} className="admin-input" /></label>
        </>}

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Difficulties & gaps" : "Difficultes & ecarts"}</h3>
        <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={difficultyEncountered} onChange={event => setDifficultyEncountered(event.target.checked)} className="h-4 w-4" />{en ? "A difficulty was encountered" : "Une difficulte a ete rencontree"}</label>
        {difficultyEncountered && <>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="difficulty_category" defaultValue={editing !== "new" ? editing.difficulty_category || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(difficultyCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Severity" : "Gravite"}<select name="difficulty_severity" defaultValue={editing !== "new" ? editing.difficulty_severity || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="difficulty_description" rows={2} defaultValue={editing !== "new" ? editing.difficulty_description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Cause" : "Cause"}<input name="difficulty_cause" defaultValue={editing !== "new" ? editing.difficulty_cause || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Impact<input name="difficulty_impact" defaultValue={editing !== "new" ? editing.difficulty_impact || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Planned/actual gap — justification" : "Ecart prevu/realise — justification"}<textarea name="variance_note" rows={2} defaultValue={editing !== "new" ? editing.variance_note || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Corrective action" : "Action corrective"}<textarea name="corrective_action" rows={2} defaultValue={editing !== "new" ? editing.corrective_action || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Action responsible" : "Responsable de l'action"}<input name="corrective_action_responsible" defaultValue={editing !== "new" ? editing.corrective_action_responsible || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="corrective_action_deadline" type="date" defaultValue={editing !== "new" ? editing.corrective_action_deadline || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Support required" : "Support requis"}<input name="support_required" defaultValue={editing !== "new" ? editing.support_required || "" : ""} className="admin-input" /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="button" onClick={createLinkedIssue} disabled={!!linkedIssueId} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50">{linkedIssueId ? (en ? "Issue created ✓" : "Issue creee ✓") : (en ? "Create an Issue" : "Creer un Issue")}</button>
            <button type="button" onClick={createLinkedRisk} disabled={!!linkedRiskId} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50">{linkedRiskId ? (en ? "Risk created ✓" : "Risque cree ✓") : (en ? "Create a Risk" : "Creer un Risk")}</button>
          </div>
        </>}

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Next steps" : "Prochaines etapes"}</h3>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Next activities / actions" : "Prochaines activites / actions"}<textarea name="next_steps" rows={2} defaultValue={editing !== "new" ? editing.next_steps || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<input name="next_steps_responsible" defaultValue={editing !== "new" ? editing.next_steps_responsible || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input name="next_steps_deadline" type="date" defaultValue={editing !== "new" ? editing.next_steps_deadline || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Support needed" : "Support necessaire"}<input name="next_steps_support" defaultValue={editing !== "new" ? editing.next_steps_support || "" : ""} className="admin-input" /></label>
        <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={managementDecisionRequired} onChange={event => setManagementDecisionRequired(event.target.checked)} className="h-4 w-4" />{en ? "Management decision required" : "Decision management requise"}</label>
        {managementDecisionRequired && <>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Decision requested" : "Decision demandee"}<input name="management_decision_requested" defaultValue={editing !== "new" ? editing.management_decision_requested || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Authority concerned" : "Autorite concernee"}<input name="management_decision_authority" defaultValue={editing !== "new" ? editing.management_decision_authority || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Deadline<input name="management_decision_deadline" type="date" defaultValue={editing !== "new" ? editing.management_decision_deadline || "" : ""} className="admin-input" /></label>
        </>}

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Evidence" : "Preuves"}</h3>
        {achievementId ? <div className="sm:col-span-2 grid gap-2">
          <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{en ? "Add evidence" : "Ajouter une preuve"}<input type="file" onChange={uploadEvidence} className="hidden" /></label>
          {evidence.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm">
            <span>{evidenceCategoryLabels[item.category][locale]} — {item.title}</span>
            <div className="flex items-center gap-3">
              {item.file_path && <button type="button" onClick={() => viewEvidence(item.file_path)} className="text-xs font-bold text-leaf">{en ? "View" : "Voir"}</button>}
              {isDraftStatus && <button type="button" onClick={() => deleteEvidence(item)} aria-label={en ? "Delete" : "Supprimer"}><TrashIcon className="h-4 text-red-600" /></button>}
            </div>
          </div>)}
        </div> : <p className="text-sm text-slate-400 sm:col-span-2">{en ? "Save a draft first to be able to add evidence." : "Enregistrez d'abord un brouillon pour pouvoir ajouter des preuves."}</p>}

        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary">{en ? "Close" : "Fermer"}</button>
          <button type="button" onClick={() => save("draft")} disabled={saving} className="btn-secondary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save draft" : "Enregistrer le brouillon")}</button>
          <button type="button" onClick={() => save("submitted")} disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Submit" : "Soumettre")}</button>
        </div>
      </div>
    </form>
  </div>;
}
