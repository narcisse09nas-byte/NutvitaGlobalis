"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { CommunicationActual, CommunicationActualStatus, CommunicationChannel, CommunicationItem, Stakeholder } from "@/lib/ppm/types";

const channelLabels: Record<CommunicationChannel, string> = { email: "Email", meeting: "Reunion", report: "Rapport", sms: "SMS", radio: "Radio", phone: "Telephone", other: "Autre" };
const statusLabels: Record<CommunicationActualStatus, string> = { draft: "Brouillon", completed: "Realisee", validated: "Validee" };
const statusTones: Record<CommunicationActualStatus, string> = {
  draft: "bg-slate-100 text-slate-600", completed: "bg-sky-50 text-sky-800", validated: "bg-mint text-forest",
};

export default function CommunicationActualsManager({ projectId, initial, communicationItems, stakeholders = [] }: {
  projectId: string; initial: CommunicationActual[]; communicationItems: CommunicationItem[]; stakeholders?: Stakeholder[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<CommunicationActual | "new" | null>(null);
  // Refinement program, Wave 7 (item 38): selecting the planned communication auto-fills known
  // fields; the "meeting" channel shows an agenda field (dynamic per communication type).
  const [planId, setPlanId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [channel, setChannel] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function openEditor(row: CommunicationActual | "new") {
    setMessage("");
    setPlanId(row !== "new" ? row.communication_item_id || "" : "");
    setPlannedDate(row !== "new" ? row.planned_date || "" : "");
    setChannel(row !== "new" ? row.channel || "" : "");
    setSubject(row !== "new" ? row.subject : "");
    setEditing(row);
  }
  function handlePlanChange(itemId: string) {
    setPlanId(itemId);
    const item = communicationItems.find(row => row.id === itemId);
    if (item) {
      if (item.next_date) setPlannedDate(item.next_date);
      setChannel(item.channel);
      setSubject(item.topic);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const selectedStakeholders = form.getAll("stakeholder_names").map(String).filter(Boolean);
    const payload = {
      project_id: projectId,
      communication_item_id: planId || null,
      planned_date: plannedDate || null,
      actual_date: String(form.get("actual_date") || "") || null,
      stakeholders: selectedStakeholders.join(", ") || null,
      participants: String(form.get("participants") || "").trim() || null,
      channel: channel || null,
      agenda: channel === "meeting" ? String(form.get("agenda") || "").trim() || null : null,
      beneficiary_count: form.get("beneficiary_count") ? Number(form.get("beneficiary_count")) : null,
      subject: subject.trim(),
      key_messages: String(form.get("key_messages") || "").trim() || null,
      information_shared: String(form.get("information_shared") || "").trim() || null,
      feedback_received: String(form.get("feedback_received") || "").trim() || null,
      decisions: String(form.get("decisions") || "").trim() || null,
      actions: String(form.get("actions") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      deadline: String(form.get("deadline") || "") || null,
      minutes_reference: String(form.get("minutes_reference") || "").trim() || null,
      status: String(form.get("status") || "draft") as CommunicationActualStatus,
    };
    if (!payload.subject) { setSaving(false); setMessage("Le sujet est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_communication_actuals").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_communication_actuals").update(payload).eq("id", (editing as CommunicationActual).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as CommunicationActual, ...current] : current.map(row => row.id === result.data.id ? result.data as CommunicationActual : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Communications realisees</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Enregistrer une communication</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.subject}</b><p className="mt-1 text-xs text-slate-400">{row.channel}{row.actual_date ? ` · ${new Date(row.actual_date).toLocaleDateString("fr-FR")}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.key_messages && <p className="mt-2 text-sm text-slate-600"><b>Messages cles :</b> {row.key_messages}</p>}
        {row.decisions && <p className="mt-2 text-sm text-slate-600"><b>Decisions :</b> {row.decisions}</p>}
        <button onClick={() => openEditor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">Modifier</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune communication realisee enregistree.</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Enregistrer une communication" : "Modifier"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Communication planifiee<select value={planId} onChange={event => handlePlanChange(event.target.value)} className="admin-input"><option value="">Aucune</option>{communicationItems.map(item => <option key={item.id} value={item.id}>{item.topic}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Sujet<input value={subject} onChange={event => setSubject(event.target.value)} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date prevue<input type="date" value={plannedDate} onChange={event => setPlannedDate(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date reelle<input name="actual_date" type="date" defaultValue={editing !== "new" ? editing.actual_date || "" : ""} className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            Parties prenantes atteintes
            <div className="max-h-40 overflow-y-auto rounded-xl border p-2">
              {stakeholders.map(item => <label key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-normal hover:bg-mint/40"><input type="checkbox" name="stakeholder_names" value={item.name} defaultChecked={editing !== "new" ? (editing.stakeholders || "").split(",").map(v => v.trim()).includes(item.name) : false} className="h-4 w-4" />{item.name}</label>)}
              {!stakeholders.length && <p className="p-2 text-sm text-slate-400">Aucune partie prenante enregistree.</p>}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-bold">Participants (nombre / noms)<input name="participants" defaultValue={editing !== "new" ? editing.participants || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Beneficiaires atteints (si applicable)<input name="beneficiary_count" type="number" min="0" defaultValue={editing !== "new" ? editing.beneficiary_count ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Canal<select value={channel} onChange={event => setChannel(event.target.value)} className="admin-input"><option value="">—</option>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "draft"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {channel === "meeting" && <label className="grid gap-2 text-sm font-bold sm:col-span-2">Ordre du jour (agenda)<textarea name="agenda" rows={2} defaultValue={editing !== "new" ? editing.agenda || "" : ""} className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Messages cles<textarea name="key_messages" rows={2} defaultValue={editing !== "new" ? editing.key_messages || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Informations partagees<textarea name="information_shared" rows={2} defaultValue={editing !== "new" ? editing.information_shared || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Feedback recu<textarea name="feedback_received" rows={2} defaultValue={editing !== "new" ? editing.feedback_received || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Decisions<textarea name="decisions" rows={2} defaultValue={editing !== "new" ? editing.decisions || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Actions<textarea name="actions" rows={2} defaultValue={editing !== "new" ? editing.actions || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Echeance<input name="deadline" type="date" defaultValue={editing !== "new" ? editing.deadline || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Reference PV<input name="minutes_reference" defaultValue={editing !== "new" ? editing.minutes_reference || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
