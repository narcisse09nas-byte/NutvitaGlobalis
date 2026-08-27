"use client";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  NcrStatus, NonConformityReport, PPMResource, QualityChecklistItem, QualityControlActual, QualityEvidence,
  QualityRequirement, QualityResult,
} from "@/lib/ppm/types";

const resultLabels: Record<QualityResult, { fr: string; en: string }> = { pending: { fr: "En attente", en: "Pending" }, conforme: { fr: "Conforme", en: "Compliant" }, non_conforme: { fr: "Non conforme", en: "Non-compliant" }, non_applicable: { fr: "Non applicable", en: "Not applicable" } };
const resultTones: Record<QualityResult, string> = {
  pending: "bg-slate-100 text-slate-600", conforme: "bg-mint text-forest", non_conforme: "bg-red-50 text-red-700", non_applicable: "bg-slate-100 text-slate-400",
};
const ncrStatusLabels: Record<NcrStatus, { fr: string; en: string }> = {
  open: { fr: "Ouverte", en: "Open" }, root_cause_identified: { fr: "Cause identifiee", en: "Root cause identified" }, capa_planned: { fr: "CAPA planifiee", en: "CAPA planned" },
  capa_implemented: { fr: "CAPA mise en oeuvre", en: "CAPA implemented" }, effectiveness_reviewed: { fr: "Efficacite revue", en: "Effectiveness reviewed" }, closed: { fr: "Cloturee", en: "Closed" },
};
const ncrSteps: NcrStatus[] = ["open", "root_cause_identified", "capa_planned", "capa_implemented", "effectiveness_reviewed", "closed"];

export default function QualityManager({ projectId, initialRequirements, initialNcrs, initialActuals, staff = [] }: {
  projectId: string; initialRequirements: QualityRequirement[]; initialNcrs: NonConformityReport[]; initialActuals: QualityControlActual[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [requirements, setRequirements] = useState(initialRequirements);
  const [ncrs, setNcrs] = useState(initialNcrs);
  const [actuals, setActuals] = useState(initialActuals);
  const [editing, setEditing] = useState<QualityRequirement | "new" | null>(null);
  const [recording, setRecording] = useState<"new" | null>(null);
  const [recordingRequirementId, setRecordingRequirementId] = useState("");
  const [checklist, setChecklist] = useState<QualityChecklistItem[]>([]);
  const [recordingEvidence, setRecordingEvidence] = useState<QualityEvidence[]>([]);
  const [savedActualId, setSavedActualId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingNcr, setEditingNcr] = useState<NonConformityReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const requirementById = useMemo(() => new Map(requirements.map(item => [item.id, item])), [requirements]);

  const score = useMemo(() => {
    const applicable = checklist.filter(item => item.result !== "non_applicable" && item.result !== "pending");
    if (!applicable.length) return null;
    return Math.round((applicable.filter(item => item.result === "conforme").length / applicable.length) * 100);
  }, [checklist]);

  function openEditor(row: QualityRequirement | "new") {
    setMessage("");
    setEditing(row);
  }

  // Refinement program, Wave 6 (item 34): recording a constat starts from the planned control —
  // selecting it auto-shows the plan's known fields (method/frequency/responsible); the user only
  // fills the actual date, result and checklist. Plan and actual are now two different tables.
  function openRecording() {
    setMessage("");
    setChecklist([]);
    setRecordingEvidence([]);
    setSavedActualId(null);
    setRecordingRequirementId("");
    setRecording("new");
  }
  const recordingRequirement = requirementById.get(recordingRequirementId);

  async function loadEvidence(actualId: string) {
    const { data } = await createClient().from("ppm_quality_evidence").select("*").eq("quality_requirement_id", actualId).order("created_at", { ascending: false });
    setRecordingEvidence((data || []) as QualityEvidence[]);
  }

  function addCriterion() { setChecklist(current => [...current, { criterion: "", result: "pending" }]); }
  function updateCriterion(index: number, patch: Partial<QualityChecklistItem>) { setChecklist(current => current.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  function removeCriterion(index: number) { setChecklist(current => current.filter((_, i) => i !== index)); }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !savedActualId) return;
    setUploading(true);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/quality/${savedActualId}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    setUploading(false);
    if (upload.error) { setMessage(upload.error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_quality_evidence").insert({ quality_requirement_id: savedActualId, title: file.name, category: "document", file_path: path, created_by: user?.id }).select("*").single();
    if (!result.error) setRecordingEvidence(current => [result.data as QualityEvidence, ...current]);
  }

  async function viewEvidence(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      title: String(form.get("title") || "").trim(),
      standard_reference: String(form.get("standard_reference") || "").trim() || null,
      description: String(form.get("description") || "").trim() || null,
      control_method: String(form.get("control_method") || "").trim() || null,
      frequency: String(form.get("frequency") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      result: "pending" as QualityResult,
      checklist: [],
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_quality_requirements").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_quality_requirements").update(payload).eq("id", (editing as QualityRequirement).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as QualityRequirement;
    setRequirements(current => isNew ? [saved, ...current] : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
  }

  async function submitRecording(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const requirementId = String(form.get("quality_requirement_id") || "");
    if (!requirementId) { setSaving(false); setMessage(en ? "Select the planned quality control." : "Selectionnez le controle qualite planifie."); return; }
    const cleanedChecklist = checklist.filter(item => item.criterion.trim());
    const payload = {
      project_id: projectId,
      quality_requirement_id: requirementId,
      control_date: String(form.get("control_date") || "") || null,
      result: String(form.get("result") || "pending") as QualityResult,
      checklist: cleanedChecklist,
      score,
      notes: String(form.get("notes") || "").trim() || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_quality_control_actuals").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as QualityControlActual;
    setActuals(current => [saved, ...current]);
    setSavedActualId(saved.id);
    const requirement = requirementById.get(requirementId);
    if (saved.result === "non_conforme" && requirement && !ncrs.some(item => item.quality_requirement_id === requirementId)) {
      const ncrResult = await supabase.from("ppm_ncr").insert({ project_id: projectId, quality_requirement_id: requirementId, title: `NCR — ${requirement.title}`, created_by: user?.id }).select("*").single();
      if (!ncrResult.error) setNcrs(current => [ncrResult.data as NonConformityReport, ...current]);
    }
    setMessage(en ? "Finding recorded. You can add evidence below." : "Constat enregistre. Vous pouvez ajouter des preuves ci-dessous.");
  }

  async function submitNcr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingNcr) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      root_cause: String(form.get("root_cause") || "").trim() || null,
      capa_action: String(form.get("capa_action") || "").trim() || null,
      capa_responsible: String(form.get("capa_responsible") || "").trim() || null,
      capa_deadline: String(form.get("capa_deadline") || "") || null,
      effectiveness_review: String(form.get("effectiveness_review") || "").trim() || null,
      status: String(form.get("status") || editingNcr.status) as NcrStatus,
    };
    const supabase = createClient();
    const result = await supabase.from("ppm_ncr").update(payload).eq("id", editingNcr.id).select("*").single();
    if (!result.error) {
      setNcrs(current => current.map(row => row.id === editingNcr.id ? result.data as NonConformityReport : row));
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `NCR — ${editingNcr.title}`, from_status: editingNcr.status, to_status: payload.status });
    }
    setEditingNcr(null);
  }

  return <div className="grid gap-8">
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Quality plan" : "Plan qualite"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New quality requirement" : "Nouvelle exigence qualite"}</button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Requirement" : "Exigence"}</th><th className="p-4">{en ? "Control method" : "Methode de controle"}</th><th className="p-4">{en ? "Frequency" : "Frequence"}</th><th className="p-4">{en ? "Responsible" : "Responsable"}</th><th className="p-4">{en ? "Findings" : "Constats"}</th><th className="p-4">Action</th></tr></thead>
          <tbody>
            {requirements.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4"><b className="text-forest">{row.title}</b>{row.standard_reference && <p className="mt-1 text-xs text-slate-400">{row.standard_reference}</p>}</td>
              <td className="p-4">{row.control_method || "—"}</td>
              <td className="p-4">{row.frequency || "—"}</td>
              <td className="p-4">{row.responsible_name || "—"}</td>
              <td className="p-4">{actuals.filter(item => item.quality_requirement_id === row.id).length}</td>
              <td className="p-4"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></td>
            </tr>)}
            {!requirements.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No quality requirement." : "Aucune exigence qualite."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Quality control findings" : "Constats de controle qualite"}</h2><button onClick={openRecording} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New finding" : "Nouveau constat"}</button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Requirement" : "Exigence"}</th><th className="p-4">Date</th><th className="p-4">Score</th><th className="p-4">{en ? "Result" : "Resultat"}</th><th className="p-4">Notes</th></tr></thead>
          <tbody>
            {actuals.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4"><b className="text-forest">{requirementById.get(row.quality_requirement_id)?.title || "—"}</b></td>
              <td className="p-4">{row.control_date ? new Date(row.control_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
              <td className="p-4">{row.score != null ? `${row.score}%` : "—"}</td>
              <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${resultTones[row.result]}`}>{resultLabels[row.result][locale]}</span></td>
              <td className="p-4">{row.notes || "—"}</td>
            </tr>)}
            {!actuals.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">{en ? "No finding recorded." : "Aucun constat enregistre."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <h2 className="text-xl font-black text-forest">{en ? "Non-conformities (NCR)" : "Non-conformites (NCR)"}</h2>
      <div className="grid gap-3">
        {ncrs.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><b className="text-forest">{row.title}</b><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{ncrStatusLabels[row.status][locale]}</span></div>
          {row.root_cause && <p className="mt-2 text-sm text-slate-600"><b>{en ? "Cause:" : "Cause :"}</b> {row.root_cause}</p>}
          {row.capa_action && <p className="mt-1 text-sm text-slate-600"><b>CAPA :</b> {row.capa_action}</p>}
          <button onClick={() => setEditingNcr(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Process the NCR" : "Instruire la NCR"}</button>
        </article>)}
        {!ncrs.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No non-conformity." : "Aucune non-conformite."}</p>}
      </div>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New quality requirement" : "Nouvelle exigence qualite") : (en ? "Edit requirement" : "Modifier l'exigence")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Standard reference" : "Reference standard"}<input name="standard_reference" defaultValue={editing !== "new" ? editing.standard_reference || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Control method" : "Methode de controle"}<input name="control_method" defaultValue={editing !== "new" ? editing.control_method || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Frequency" : "Frequence"}<input name="frequency" defaultValue={editing !== "new" ? editing.frequency || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {recording && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitRecording} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "New control finding" : "Nouveau constat de controle"}</h2><button type="button" onClick={() => setRecording(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Planned quality control" : "Controle qualite planifie"}<select name="quality_requirement_id" value={recordingRequirementId} onChange={event => setRecordingRequirementId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{requirements.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          {recordingRequirement && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
            {recordingRequirement.control_method && <>{en ? "Method" : "Methode"} : <b>{recordingRequirement.control_method}</b>{" · "}</>}
            {recordingRequirement.frequency && <>{en ? "Frequency" : "Frequence"} : <b>{recordingRequirement.frequency}</b>{" · "}</>}
            {en ? "Responsible" : "Responsable"} : <b>{recordingRequirement.responsible_name || "—"}</b>
          </p>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Actual control date" : "Date reelle du controle"}<input name="control_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Overall result" : "Resultat global"}<select name="result" defaultValue="pending" className="admin-input">{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} className="admin-input" /></label>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase text-slate-400">Checklist</h3>{score != null && <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">Score : {score}%</span>}</div>
            <div className="mt-2 grid gap-2">
              {checklist.map((row, index) => <div key={index} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2">
                <input placeholder={en ? "Criterion" : "Critere"} value={row.criterion} onChange={event => updateCriterion(index, { criterion: event.target.value })} className="admin-input" />
                <select value={row.result} onChange={event => updateCriterion(index, { result: event.target.value as QualityResult })} className="admin-input">{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select>
                <input placeholder={en ? "Comment" : "Commentaire"} value={row.comment || ""} onChange={event => updateCriterion(index, { comment: event.target.value })} className="admin-input" />
                <button type="button" onClick={() => removeCriterion(index)} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-5 text-red-600" /></button>
              </div>)}
              <button type="button" onClick={addCriterion} className="btn-secondary w-fit px-3 py-1.5 text-xs">+ {en ? "Criterion" : "Critere"}</button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Evidence" : "Preuves"}</h3>
            {savedActualId ? <div className="mt-2 grid gap-2">
              <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : (en ? "Add evidence" : "Ajouter une preuve")}<input type="file" onChange={uploadEvidence} className="hidden" /></label>
              {recordingEvidence.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm"><span>{item.title}</span>{item.file_path && <button type="button" onClick={() => viewEvidence(item.file_path)} className="text-xs font-bold text-leaf">{en ? "View" : "Voir"}</button>}</div>)}
            </div> : <p className="mt-2 text-sm text-slate-400">{en ? "Save the finding first to be able to add evidence." : "Enregistrez d'abord le constat pour pouvoir ajouter des preuves."}</p>}
          </div>

          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={() => setRecording(null)} className="btn-secondary">{en ? "Close" : "Fermer"}</button>
            {!savedActualId && <button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save the finding" : "Enregistrer le constat")}</button>}
          </div>
        </div>
      </form>
    </div>}

    {editingNcr && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitNcr} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Process" : "Instruire"} — {editingNcr.title}</h2><button type="button" onClick={() => setEditingNcr(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Root cause" : "Cause racine (Root Cause)"}<textarea name="root_cause" rows={2} defaultValue={editingNcr.root_cause || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "CAPA action" : "Action CAPA"}<textarea name="capa_action" rows={2} defaultValue={editingNcr.capa_action || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "CAPA responsible" : "Responsable CAPA"}<SearchableSelect name="capa_responsible" options={staffOptions} defaultValue={editingNcr.capa_responsible || ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "CAPA deadline" : "Echeance CAPA"}<input name="capa_deadline" type="date" defaultValue={editingNcr.capa_deadline || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Effectiveness review" : "Revue d'efficacite"}<textarea name="effectiveness_review" rows={2} defaultValue={editingNcr.effectiveness_review || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editingNcr.status} className="admin-input">{ncrSteps.map(step => <option key={step} value={step}>{ncrStatusLabels[step][locale]}</option>)}</select></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingNcr(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Save" : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
