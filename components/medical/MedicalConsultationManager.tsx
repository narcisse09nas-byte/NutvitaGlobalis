"use client";
import { ChangeEvent, FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Medical consultation record fields (chief_complaint/history/examination/assessment/care_plan/
// prescriptions) are genuinely clinical, so this is new UI rather than a copy of the nutritionist's
// 9-section ConsultationManager.tsx — same overall shape (patient picker, status, save), different
// content.
type Row = Record<string, any>;
type Prescription = { drug: string; dosage: string; instructions: string };

export default function MedicalConsultationManager({ patients, specialistId, onClose, onSaved }: {
  patients: Row[]; specialistId: string; onClose: () => void; onSaved: (row: Row) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function addPrescription() { setPrescriptions(current => [...current, { drug: "", dosage: "", instructions: "" }]); }
  function updatePrescription(index: number, patch: Partial<Prescription>) { setPrescriptions(current => current.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  function removePrescription(index: number) { setPrescriptions(current => current.filter((_, i) => i !== index)); }

  async function uploadDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `medical/${specialistId}/${crypto.randomUUID()}-${safe}`;
    const upload = await createClient().storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream" });
    setUploading(false);
    if (upload.error) { setMessage(upload.error.message); return; }
    setDocuments(current => [...current, { name: file.name, path }]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) { setMessage("Selectionnez un patient."); return; }
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      specialist_id: specialistId,
      client_id: clientId,
      scheduled_at: String(form.get("scheduled_at") || "") || null,
      consultation_mode: String(form.get("consultation_mode") || "video"),
      chief_complaint: String(form.get("chief_complaint") || "").trim() || null,
      history: String(form.get("history") || "").trim() || null,
      examination: String(form.get("examination") || "").trim() || null,
      assessment: String(form.get("assessment") || "").trim() || null,
      care_plan: String(form.get("care_plan") || "").trim() || null,
      prescriptions: prescriptions.filter(item => item.drug.trim()),
      documents,
      status: String(form.get("status") || "scheduled"),
    };
    if (payload.status === "completed") (payload as Row).completed_at = new Date().toISOString();
    const result = await createClient().from("medical_consultations").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    onSaved(result.data as Row);
  }

  return <form onSubmit={submit} className="grid gap-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">Patient<select value={clientId} onChange={event => setClientId(event.target.value)} required className="admin-input"><option value="">Selectionner...</option>{patients.map(item => <option key={item.id} value={item.id}>{item.full_name || item.email}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Date et heure<input name="scheduled_at" type="datetime-local" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Mode<select name="consultation_mode" defaultValue="video" className="admin-input"><option value="video">Video</option><option value="in_person">En personne</option><option value="phone">Telephone</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue="scheduled" className="admin-input"><option value="scheduled">Planifiee</option><option value="completed">Terminee</option><option value="cancelled">Annulee</option></select></label>
    </div>
    <label className="grid gap-2 text-sm font-bold">Motif de consultation (chief complaint)<textarea name="chief_complaint" rows={2} className="admin-input" /></label>
    <label className="grid gap-2 text-sm font-bold">Anamnese (history)<textarea name="history" rows={2} className="admin-input" /></label>
    <label className="grid gap-2 text-sm font-bold">Examen clinique<textarea name="examination" rows={2} className="admin-input" /></label>
    <label className="grid gap-2 text-sm font-bold">Evaluation / diagnostic<textarea name="assessment" rows={2} className="admin-input" /></label>
    <label className="grid gap-2 text-sm font-bold">Plan de prise en charge<textarea name="care_plan" rows={2} className="admin-input" /></label>

    <div>
      <div className="flex items-center justify-between"><p className="text-sm font-black uppercase text-slate-400">Prescriptions</p><button type="button" onClick={addPrescription} className="btn-secondary px-3 py-1.5 text-xs">+ Prescription</button></div>
      <div className="mt-2 grid gap-2">
        {prescriptions.map((row, index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <input placeholder="Medicament" value={row.drug} onChange={event => updatePrescription(index, { drug: event.target.value })} className="admin-input" />
          <input placeholder="Posologie" value={row.dosage} onChange={event => updatePrescription(index, { dosage: event.target.value })} className="admin-input" />
          <input placeholder="Instructions" value={row.instructions} onChange={event => updatePrescription(index, { instructions: event.target.value })} className="admin-input" />
          <button type="button" onClick={() => removePrescription(index)} className="text-red-600">×</button>
        </div>)}
      </div>
    </div>

    <div>
      <p className="text-sm font-black uppercase text-slate-400">Documents</p>
      <div className="mt-2 grid gap-2">
        <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? "Televersement..." : "Ajouter un document"}<input type="file" onChange={uploadDocument} className="hidden" /></label>
        {documents.map((doc, index) => <span key={index} className="text-xs font-bold text-leaf">{doc.name}</span>)}
      </div>
    </div>

    {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer la consultation"}</button></div>
  </form>;
}
