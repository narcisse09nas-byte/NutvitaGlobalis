"use client";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type {
  NcrStatus, NonConformityReport, QualityChecklistItem, QualityControlActual, QualityEvidence,
  QualityRequirement, QualityResult,
} from "@/lib/ppm/types";

const resultLabels: Record<QualityResult, string> = { pending: "En attente", conforme: "Conforme", non_conforme: "Non conforme", non_applicable: "Non applicable" };
const resultTones: Record<QualityResult, string> = {
  pending: "bg-slate-100 text-slate-600", conforme: "bg-mint text-forest", non_conforme: "bg-red-50 text-red-700", non_applicable: "bg-slate-100 text-slate-400",
};
const ncrStatusLabels: Record<NcrStatus, string> = {
  open: "Ouverte", root_cause_identified: "Cause identifiee", capa_planned: "CAPA planifiee",
  capa_implemented: "CAPA mise en oeuvre", effectiveness_reviewed: "Efficacite revue", closed: "Cloturee",
};
const ncrSteps: NcrStatus[] = ["open", "root_cause_identified", "capa_planned", "capa_implemented", "effectiveness_reviewed", "closed"];

export default function QualityManager({ projectId, initialRequirements, initialNcrs, initialActuals }: {
  projectId: string; initialRequirements: QualityRequirement[]; initialNcrs: NonConformityReport[]; initialActuals: QualityControlActual[];
}) {
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
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
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
    if (!requirementId) { setSaving(false); setMessage("Selectionnez le controle qualite planifie."); return; }
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
    setMessage("Constat enregistre. Vous pouvez ajouter des preuves ci-dessous.");
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
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Plan qualite</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle exigence qualite</button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Exigence</th><th className="p-4">Methode de controle</th><th className="p-4">Frequence</th><th className="p-4">Responsable</th><th className="p-4">Constats</th><th className="p-4">Action</th></tr></thead>
          <tbody>
            {requirements.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4"><b className="text-forest">{row.title}</b>{row.standard_reference && <p className="mt-1 text-xs text-slate-400">{row.standard_reference}</p>}</td>
              <td className="p-4">{row.control_method || "—"}</td>
              <td className="p-4">{row.frequency || "—"}</td>
              <td className="p-4">{row.responsible_name || "—"}</td>
              <td className="p-4">{actuals.filter(item => item.quality_requirement_id === row.id).length}</td>
              <td className="p-4"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
            </tr>)}
            {!requirements.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucune exigence qualite.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Constats de controle qualite</h2><button onClick={openRecording} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau constat</button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Exigence</th><th className="p-4">Date</th><th className="p-4">Score</th><th className="p-4">Resultat</th><th className="p-4">Notes</th></tr></thead>
          <tbody>
            {actuals.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-4"><b className="text-forest">{requirementById.get(row.quality_requirement_id)?.title || "—"}</b></td>
              <td className="p-4">{row.control_date ? new Date(row.control_date).toLocaleDateString("fr-FR") : "—"}</td>
              <td className="p-4">{row.score != null ? `${row.score}%` : "—"}</td>
              <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${resultTones[row.result]}`}>{resultLabels[row.result]}</span></td>
              <td className="p-4">{row.notes || "—"}</td>
            </tr>)}
            {!actuals.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun constat enregistre.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-4">
      <h2 className="text-xl font-black text-forest">Non-conformites (NCR)</h2>
      <div className="grid gap-3">
        {ncrs.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><b className="text-forest">{row.title}</b><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{ncrStatusLabels[row.status]}</span></div>
          {row.root_cause && <p className="mt-2 text-sm text-slate-600"><b>Cause :</b> {row.root_cause}</p>}
          {row.capa_action && <p className="mt-1 text-sm text-slate-600"><b>CAPA :</b> {row.capa_action}</p>}
          <button onClick={() => setEditingNcr(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">Instruire la NCR</button>
        </article>)}
        {!ncrs.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune non-conformite.</p>}
      </div>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvelle exigence qualite" : "Modifier l'exigence"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Reference standard<input name="standard_reference" defaultValue={editing !== "new" ? editing.standard_reference || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Methode de controle<input name="control_method" defaultValue={editing !== "new" ? editing.control_method || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Frequence<input name="frequency" defaultValue={editing !== "new" ? editing.frequency || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}

    {recording && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitRecording} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">Nouveau constat de controle</h2><button type="button" onClick={() => setRecording(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Controle qualite planifie<select name="quality_requirement_id" value={recordingRequirementId} onChange={event => setRecordingRequirementId(event.target.value)} required className="admin-input"><option value="">Selectionner...</option>{requirements.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          {recordingRequirement && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
            {recordingRequirement.control_method && <>Methode : <b>{recordingRequirement.control_method}</b>{" · "}</>}
            {recordingRequirement.frequency && <>Frequence : <b>{recordingRequirement.frequency}</b>{" · "}</>}
            Responsable : <b>{recordingRequirement.responsible_name || "—"}</b>
          </p>}
          <label className="grid gap-2 text-sm font-bold">Date reelle du controle<input name="control_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Resultat global<select name="result" defaultValue="pending" className="admin-input">{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} className="admin-input" /></label>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase text-slate-400">Checklist</h3>{score != null && <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">Score : {score}%</span>}</div>
            <div className="mt-2 grid gap-2">
              {checklist.map((row, index) => <div key={index} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2">
                <input placeholder="Critere" value={row.criterion} onChange={event => updateCriterion(index, { criterion: event.target.value })} className="admin-input" />
                <select value={row.result} onChange={event => updateCriterion(index, { result: event.target.value as QualityResult })} className="admin-input">{Object.entries(resultLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <input placeholder="Commentaire" value={row.comment || ""} onChange={event => updateCriterion(index, { comment: event.target.value })} className="admin-input" />
                <button type="button" onClick={() => removeCriterion(index)} aria-label="Retirer"><TrashIcon className="h-5 text-red-600" /></button>
              </div>)}
              <button type="button" onClick={addCriterion} className="btn-secondary w-fit px-3 py-1.5 text-xs">+ Critere</button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <h3 className="text-sm font-black uppercase text-slate-400">Preuves</h3>
            {savedActualId ? <div className="mt-2 grid gap-2">
              <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? "Televersement..." : "Ajouter une preuve"}<input type="file" onChange={uploadEvidence} className="hidden" /></label>
              {recordingEvidence.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm"><span>{item.title}</span>{item.file_path && <button type="button" onClick={() => viewEvidence(item.file_path)} className="text-xs font-bold text-leaf">Voir</button>}</div>)}
            </div> : <p className="mt-2 text-sm text-slate-400">Enregistrez d&apos;abord le constat pour pouvoir ajouter des preuves.</p>}
          </div>

          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={() => setRecording(null)} className="btn-secondary">Fermer</button>
            {!savedActualId && <button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer le constat"}</button>}
          </div>
        </div>
      </form>
    </div>}

    {editingNcr && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitNcr} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Instruire — {editingNcr.title}</h2><button type="button" onClick={() => setEditingNcr(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Cause racine (Root Cause)<textarea name="root_cause" rows={2} defaultValue={editingNcr.root_cause || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Action CAPA<textarea name="capa_action" rows={2} defaultValue={editingNcr.capa_action || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable CAPA<input name="capa_responsible" defaultValue={editingNcr.capa_responsible || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Echeance CAPA<input name="capa_deadline" type="date" defaultValue={editingNcr.capa_deadline || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Revue d&apos;efficacite<textarea name="effectiveness_review" rows={2} defaultValue={editingNcr.effectiveness_review || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editingNcr.status} className="admin-input">{ncrSteps.map(step => <option key={step} value={step}>{ncrStatusLabels[step]}</option>)}</select></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingNcr(null)} className="btn-secondary">Annuler</button><button className="btn-primary">Enregistrer</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
