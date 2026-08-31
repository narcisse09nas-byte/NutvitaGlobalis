"use client";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import WorkflowStatusActions, { type WorkflowAction } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  NcrStatus, NonConformityReport, PPMResource, QualityChecklistItem, QualityControlActual, QualityEvidence,
  QualityRequirement, QualityResult, QualityStandard, ApprovalWorkflowStatus,
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
const standardFrequencies = ["daily", "weekly", "monthly", "quarterly", "semiannual", "annual", "per_activity", "per_deliverable", "ad_hoc"] as const;
const approvalLabels: Record<ApprovalWorkflowStatus, { fr: string; en: string }> = { draft:{fr:"Brouillon",en:"Draft"}, submitted:{fr:"Soumise",en:"Submitted"}, verified:{fr:"Verifiee",en:"Verified"}, approved:{fr:"Approuvee",en:"Approved"}, returned:{fr:"Retournee",en:"Returned"}, rejected:{fr:"Rejetee",en:"Rejected"} };
const approvalTones: Record<ApprovalWorkflowStatus,string> = { draft:"bg-slate-100 text-slate-600", submitted:"bg-sky-50 text-sky-800", verified:"bg-amber-50 text-amber-800", approved:"bg-mint text-forest", returned:"bg-orange/10 text-orange", rejected:"bg-red-50 text-red-700" };
const approvalActions = (status: ApprovalWorkflowStatus): WorkflowAction[] => status === "draft" || status === "returned" ? [{value:"submitted",label:"Soumettre",tone:"primary",requireNote:true}] : status === "submitted" ? [{value:"verified",label:"Verifier",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true},{value:"rejected",label:"Rejeter",tone:"danger",requireNote:true}] : status === "verified" ? [{value:"approved",label:"Approuver",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true}] : [];

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
  const [frequency, setFrequency] = useState("");
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [detailActual, setDetailActual] = useState<QualityControlActual | null>(null);
  const [ncrHistory, setNcrHistory] = useState<{id:string;action:string;from_status?:string|null;to_status?:string|null;note?:string|null;created_at:string}[]>([]);
  const requirementById = useMemo(() => new Map(requirements.map(item => [item.id, item])), [requirements]);

  const score = useMemo(() => {
    const applicable = checklist.filter(item => item.result !== "non_applicable" && item.result !== "pending");
    if (!applicable.length) return null;
    return Math.round((applicable.filter(item => item.result === "conforme").length / applicable.length) * 100);
  }, [checklist]);

  function openEditor(row: QualityRequirement | "new") {
    setMessage("");
    const currentFrequency = row !== "new" ? row.frequency || "" : "";
    setFrequency(currentFrequency ? (standardFrequencies.includes(currentFrequency as typeof standardFrequencies[number]) ? currentFrequency : "other") : "");
    setStandards(row !== "new" && row.standards?.length ? row.standards : row !== "new" && row.standard_reference ? [{ id: `STD-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`, description: row.standard_reference, control_method: row.control_method || "visual" }] : [{ id: `STD-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`, description: "", control_method: "visual" }]);
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
    setChecklist([]);
    setRecording("new");
  }
  const recordingRequirement = requirementById.get(recordingRequirementId);
  function selectRecordingRequirement(id: string) {
    setRecordingRequirementId(id);
    const requirement = requirementById.get(id);
    setChecklist((requirement?.standards || []).map(item => ({ id: item.id, criterion: item.description, description: item.description, control_method: item.control_method === "other" ? item.control_method_other : item.control_method, result: "pending" })));
  }

  async function loadEvidence(actualId: string) {
    const { data } = await createClient().from("ppm_quality_evidence").select("*").eq("quality_control_actual_id", actualId).order("created_at", { ascending: false });
    setRecordingEvidence((data || []) as QualityEvidence[]);
  }

  function addCriterion() { setChecklist(current => [...current, { criterion: "", result: "pending" }]); }
  function updateCriterion(index: number, patch: Partial<QualityChecklistItem>) { setChecklist(current => current.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  function removeCriterion(index: number) { setChecklist(current => current.filter((_, i) => i !== index)); }
  function addStandard() { setStandards(current => [...current, { id: `STD-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`, description: "", control_method: "visual" }]); }
  function updateStandard(index: number, patch: Partial<QualityStandard>) { setStandards(current => current.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  function removeStandard(index: number) { setStandards(current => current.filter((_, i) => i !== index)); }

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
    const result = await supabase.from("ppm_quality_evidence").insert({ quality_requirement_id: recordingRequirementId, quality_control_actual_id: savedActualId, title: file.name, category: "document", file_path: path, created_by: user?.id }).select("*").single();
    if (!result.error) setRecordingEvidence(current => [result.data as QualityEvidence, ...current]);
  }

  async function viewEvidence(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function changeRequirementStatus(row: QualityRequirement, nextStatus: string, reviewedByName: string | null, note: string | null) {
    const supabase = createClient();
    const fromStatus = row.workflow_status || "draft";
    const result = await supabase.from("ppm_quality_requirements").update({ workflow_status: nextStatus }).eq("id", row.id).select("*").single();
    if (result.error) return { error: result.error.message };
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ppm_history").insert({ entity_type:"quality_requirement", entity_id:row.id, actor_id:user?.id, action:reviewedByName || nextStatus, from_status:fromStatus, to_status:nextStatus, note });
    setRequirements(current => current.map(item => item.id === row.id ? result.data as QualityRequirement : item));
  }

  async function reopenRequirement(row: QualityRequirement) {
    const comment = window.prompt(en ? "Mandatory reopening reason" : "Motif obligatoire de reouverture");
    if (!comment?.trim()) return;
    const supabase = createClient(); const { data:{user} } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_quality_requirements").update({ control_state:"open", result:"pending" }).eq("id",row.id).select("*").single();
    if (!result.error) { await supabase.from("ppm_history").insert({entity_type:"quality_requirement",entity_id:row.id,actor_id:user?.id,action:"Reouverture du controle",from_status:"closed_compliant",to_status:"open",note:comment.trim()}); setRequirements(current=>current.map(item=>item.id===row.id?result.data as QualityRequirement:item)); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      title: String(form.get("title") || "").trim(),
      standard_reference: standards.map(item => item.description).filter(Boolean).join("; ") || null,
      standards: standards.filter(item => item.description.trim()),
      description: String(form.get("description") || "").trim() || null,
      control_method: standards.map(item => item.control_method === "other" ? item.control_method_other : item.control_method).filter(Boolean).join("; ") || null,
      frequency: frequency === "other" ? String(form.get("frequency_other") || "").trim() || null : frequency || null,
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

  async function openNcr(row: NonConformityReport) {
    setEditingNcr(row);
    const result = await createClient().from("ppm_history").select("*").eq("entity_type","ncr").eq("entity_id",row.id).order("created_at",{ascending:false});
    setNcrHistory(result.data || []);
  }

  async function submitNcr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingNcr) return;
    const form = new FormData(event.currentTarget);
    const workflowComment = String(form.get("workflow_comment") || "").trim();
    if (!workflowComment) { setMessage(en ? "A comment is required to change the NCR status." : "Un commentaire est obligatoire pour changer le statut NCR."); return; }
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
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">{en ? "Requirement" : "Exigence"}</th><th className="p-4">{en ? "Control method" : "Methode de controle"}</th><th className="p-4">{en ? "Frequency" : "Frequence"}</th><th className="p-4">{en ? "Responsible" : "Responsable"}</th><th className="p-4">{en ? "Findings" : "Constats"}</th><th className="p-4">{en ? "Workflow" : "Workflow"}</th><th className="p-4">Action</th></tr></thead>
          <tbody>
            {requirements.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4 font-mono text-xs font-bold">{row.requirement_code || row.id.slice(0,8)}</td>
              <td className="p-4"><b className="text-forest">{row.title}</b>{row.standard_reference && <p className="mt-1 text-xs text-slate-400">{row.standard_reference}</p>}</td>
              <td className="p-4">{row.control_method || "—"}</td>
              <td className="p-4">{row.frequency || "—"}</td>
              <td className="p-4">{row.responsible_name || "—"}</td>
              <td className="p-4">{actuals.filter(item => item.quality_requirement_id === row.id).length}</td>
              <td className="p-4"><WorkflowStatusActions entityLabel={en ? "Quality requirement" : "Exigence qualite"} itemTitle={row.title} status={row.workflow_status || "draft"} statusLabels={Object.fromEntries(Object.entries(approvalLabels).map(([key,value]) => [key,value[locale]]))} statusTones={approvalTones} actions={approvalActions(row.workflow_status || "draft")} staff={staff} onConfirm={input => changeRequirementStatus(row,input.nextStatus,input.reviewedByName,input.note)} /></td><td className="p-4"><div className="grid gap-2">{["draft","returned"].includes(row.workflow_status || "draft") && <button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button>}{row.control_state === "closed_compliant" && <button onClick={() => reopenRequirement(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Reopen control" : "Rouvrir le controle"}</button>}</div></td>
            </tr>)}
            {!requirements.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{en ? "No quality requirement." : "Aucune exigence qualite."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Quality control findings" : "Constats de controle qualite"}</h2><button onClick={openRecording} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New finding" : "Nouveau constat"}</button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">{en ? "Requirement" : "Exigence"}</th><th className="p-4">Date</th><th className="p-4">Score</th><th className="p-4">{en ? "Result" : "Resultat"}</th><th className="p-4">Notes</th><th className="p-4">Action</th></tr></thead>
          <tbody>
            {actuals.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4 font-mono text-xs font-bold">{row.control_code || row.id.slice(0,8)}</td>
              <td className="p-4"><b className="text-forest">{requirementById.get(row.quality_requirement_id)?.title || "—"}</b></td>
              <td className="p-4">{row.control_date ? new Date(row.control_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
              <td className="p-4">{row.score != null ? `${row.score}%` : "—"}</td>
              <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${resultTones[row.result]}`}>{resultLabels[row.result][locale]}</span></td>
              <td className="p-4">{row.notes || "—"}</td>
            </tr>)}
            {!actuals.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No finding recorded." : "Aucun constat enregistre."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <h2 className="text-xl font-black text-forest">{en ? "Non-conformities (NCR)" : "Non-conformites (NCR)"}</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">NCR</th><th className="p-4">{en ? "Root cause" : "Cause racine"}</th><th className="p-4">CAPA</th><th className="p-4">{en ? "Responsible / deadline" : "Responsable / echeance"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead><tbody>{ncrs.map(row => <tr key={row.id} className="border-t align-top"><td className="p-4 font-mono text-xs font-bold">{row.id.slice(0,8)}</td><td className="p-4 font-bold text-forest">{row.title}</td><td className="p-4">{row.root_cause || "-"}</td><td className="p-4">{row.capa_action || "-"}</td><td className="p-4">{row.capa_responsible || "-"}{row.capa_deadline&&<small className="block text-slate-400">{row.capa_deadline}</small>}</td><td className="p-4"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{ncrStatusLabels[row.status][locale]}</span></td><td className="p-4"><button onClick={() => openNcr(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Process / history" : "Instruire / historique"}</button></td></tr>)}{!ncrs.length&&<tr><td colSpan={7} className="p-8 text-center text-slate-400">{en?"No non-conformity.":"Aucune non-conformite."}</td></tr>}</tbody></table></div>    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New quality requirement" : "Nouvelle exigence qualite") : (en ? "Edit requirement" : "Modifier l'exigence")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <fieldset className="grid gap-3 rounded-2xl border p-4 sm:col-span-2"><div className="flex items-center justify-between"><legend className="text-sm font-black">{en ? "Standards and control methods" : "Standards et methodes de controle"}</legend><button type="button" onClick={addStandard} className="btn-secondary px-3 py-1.5 text-xs">+ {en ? "Add a standard" : "Ajouter un standard"}</button></div>{standards.map((standard, index) => <div key={standard.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[90px_1fr_190px_auto]"><span className="font-mono text-xs font-bold text-slate-500">{standard.id}</span><textarea value={standard.description} onChange={event => updateStandard(index, { description: event.target.value })} required placeholder={en ? "Standard description" : "Description du standard"} className="admin-input"/><div className="grid gap-2"><select value={standard.control_method} onChange={event => updateStandard(index, { control_method: event.target.value })} className="admin-input"><option value="visual">{en ? "Visual inspection" : "Inspection visuelle"}</option><option value="measurement">{en ? "Measurement" : "Mesure"}</option><option value="document_review">{en ? "Document review" : "Revue documentaire"}</option><option value="test">{en ? "Test / analysis" : "Test / analyse"}</option><option value="interview">{en ? "Interview" : "Entretien"}</option><option value="observation">{en ? "Direct observation" : "Observation directe"}</option><option value="other">{en ? "Other (specify)" : "Autre a preciser"}</option></select>{standard.control_method === "other" && <input value={standard.control_method_other || ""} onChange={event => updateStandard(index, { control_method_other: event.target.value })} required placeholder={en ? "Specify method" : "Preciser la methode"} className="admin-input"/>}</div><button type="button" onClick={() => removeStandard(index)} disabled={standards.length === 1} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-5 text-red-600"/></button></div>)}</fieldset>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <div className="grid gap-3"><label className="grid gap-2 text-sm font-bold">{en ? "Frequency" : "Frequence"}<select value={frequency} onChange={event => setFrequency(event.target.value)} className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option><option value="daily">{en ? "Daily" : "Quotidienne"}</option><option value="weekly">{en ? "Weekly" : "Hebdomadaire"}</option><option value="monthly">{en ? "Monthly" : "Mensuelle"}</option><option value="quarterly">{en ? "Quarterly" : "Trimestrielle"}</option><option value="semiannual">{en ? "Semiannual" : "Semestrielle"}</option><option value="annual">{en ? "Annual" : "Annuelle"}</option><option value="per_activity">{en ? "Per activity" : "Par activite"}</option><option value="per_deliverable">{en ? "Per deliverable" : "Par livrable"}</option><option value="ad_hoc">{en ? "As needed" : "Selon le besoin"}</option><option value="other">{en ? "Other (specify)" : "Autre a preciser"}</option></select></label>{frequency === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify the frequency" : "Preciser la frequence"}<input name="frequency_other" defaultValue={editing !== "new" && !standardFrequencies.includes((editing.frequency || "") as typeof standardFrequencies[number]) ? editing.frequency || "" : ""} required className="admin-input" /></label>}</div>
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
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Planned quality control" : "Controle qualite planifie"}<select name="quality_requirement_id" value={recordingRequirementId} onChange={event => selectRecordingRequirement(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{requirements.filter(item => item.workflow_status === "approved" && item.control_state !== "closed_compliant").map(item => <option key={item.id} value={item.id}>{item.requirement_code ? `${item.requirement_code} - ` : ""}{item.title}</option>)}</select></label>
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
          <label className="grid gap-2 text-sm font-bold">{en ? "CAPA action" : "Action CAPA"}<span className="text-xs font-normal text-slate-500">{en ? "Describe the corrective and preventive action, expected result, owner and implementation evidence." : "Decrivez l action corrective et preventive, le resultat attendu, le responsable et la preuve de mise en oeuvre."}</span><textarea name="capa_action" rows={2} defaultValue={editingNcr.capa_action || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "CAPA responsible" : "Responsable CAPA"}<SearchableSelect name="capa_responsible" options={staffOptions} defaultValue={editingNcr.capa_responsible || ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "CAPA deadline" : "Echeance CAPA"}<input name="capa_deadline" type="date" defaultValue={editingNcr.capa_deadline || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Effectiveness review" : "Revue d'efficacite"}<span className="text-xs font-normal text-slate-500">{en ? "State the evidence reviewed, date, observed result and whether the CAPA prevented recurrence." : "Indiquez les preuves examinees, la date, le resultat observe et si la CAPA a evite la recurrence."}</span><textarea name="effectiveness_review" rows={2} defaultValue={editingNcr.effectiveness_review || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editingNcr.status} className="admin-input">{ncrSteps.map(step => <option key={step} value={step}>{ncrStatusLabels[step][locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status change comment" : "Commentaire de changement de statut"}<textarea name="workflow_comment" required rows={2} className="admin-input" /></label>
          {ncrHistory.length > 0 && <div className="rounded-xl bg-slate-50 p-3"><h3 className="text-sm font-black">{en ? "History" : "Historique"}</h3>{ncrHistory.map(item=><p key={item.id} className="mt-2 text-xs"><b>{item.from_status || "-"} → {item.to_status || "-"}</b> · {new Date(item.created_at).toLocaleString(en?"en-US":"fr-FR")} · {item.action}<span className="block italic">{item.note}</span></p>)}</div>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingNcr(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Save" : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}

    {detailActual && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4"><div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl"><div className="flex justify-between"><div><p className="font-mono text-xs font-bold text-slate-500">{detailActual.control_code || detailActual.id}</p><h2 className="text-xl font-black text-forest">{requirementById.get(detailActual.quality_requirement_id)?.title}</h2></div><button onClick={() => setDetailActual(null)}><XMarkIcon className="h-6"/></button></div><div className="mt-5 grid gap-4"><p><b>{en ? "Result" : "Resultat"}:</b> {resultLabels[detailActual.result][locale]}</p><p><b>Score:</b> {detailActual.score ?? "-"}</p><p><b>Notes:</b> {detailActual.notes || "-"}</p><div><h3 className="font-black">Checklist</h3><div className="mt-2 overflow-x-auto rounded-xl border"><table className="w-full text-sm"><tbody>{detailActual.checklist.map((item,index)=><tr key={index} className="border-t"><td className="p-3 font-mono text-xs">{item.id || index+1}</td><td className="p-3">{item.criterion}</td><td className="p-3">{resultLabels[item.result][locale]}</td><td className="p-3">{item.comment || "-"}</td></tr>)}</tbody></table></div></div><div><h3 className="font-black">{en ? "Attachments" : "Pieces jointes"}</h3>{recordingEvidence.map(item=><button key={item.id} onClick={() => viewEvidence(item.file_path)} className="mt-2 block text-sm font-bold text-leaf underline">{item.title}</button>)}{!recordingEvidence.length&&<p className="text-sm text-slate-400">{en?"No attachment.":"Aucune piece jointe."}</p>}</div></div></div></div>}  </div>;
}
