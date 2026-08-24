"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import type { CommunicationChannel, CommunicationItem, CommunicationStatus, PPMResource, Stakeholder } from "@/lib/ppm/types";

const channelLabels: Record<CommunicationChannel, string> = { email: "Email", meeting: "Reunion", report: "Rapport", sms: "SMS", radio: "Radio", phone: "Telephone", other: "Autre" };
const statusLabels: Record<CommunicationStatus, string> = { planned: "Planifie", sent: "Envoye", done: "Realise", cancelled: "Annule" };
const statusTones: Record<CommunicationStatus, string> = {
  planned: "bg-slate-100 text-slate-600", sent: "bg-sky-50 text-sky-800", done: "bg-mint text-forest", cancelled: "bg-red-50 text-red-700",
};

export default function CommunicationPlanManager({ projectId, initial, stakeholders, staff = [] }: {
  projectId: string; initial: CommunicationItem[]; stakeholders: Stakeholder[]; staff?: PPMResource[];
}) {
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<CommunicationItem | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const stakeholderLabel = (id?: string | null) => stakeholders.find(item => item.id === id)?.name;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      stakeholder_id: String(form.get("stakeholder_id") || "") || null,
      audience: String(form.get("audience") || "").trim() || null,
      topic: String(form.get("topic") || "").trim(),
      message: String(form.get("message") || "").trim() || null,
      channel: String(form.get("channel") || "email") as CommunicationChannel,
      frequency: String(form.get("frequency") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      next_date: String(form.get("next_date") || "") || null,
      last_sent_date: String(form.get("last_sent_date") || "") || null,
      status: String(form.get("status") || "planned") as CommunicationStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.topic) { setSaving(false); setMessage("Le sujet est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_communication_items").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_communication_items").update(payload).eq("id", (editing as CommunicationItem).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as CommunicationItem, ...current] : current.map(row => row.id === result.data.id ? result.data as CommunicationItem : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Plan de communication</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle communication</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Sujet</th><th className="p-4">Audience</th><th className="p-4">Canal</th><th className="p-4">Frequence</th><th className="p-4">Prochaine echeance</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.topic}</b>{row.responsible_name && <p className="mt-1 text-xs text-slate-400">Responsable : {row.responsible_name}</p>}</td>
            <td className="p-4">{stakeholderLabel(row.stakeholder_id) || row.audience || "—"}</td>
            <td className="p-4">{channelLabels[row.channel]}</td>
            <td className="p-4">{row.frequency || "—"}</td>
            <td className="p-4">{row.next_date ? new Date(row.next_date).toLocaleDateString("fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span></td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">Aucune communication planifiee.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvelle communication" : "Modifier la communication"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Sujet<input name="topic" defaultValue={editing !== "new" ? editing.topic : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Partie prenante<select name="stakeholder_id" defaultValue={editing !== "new" ? editing.stakeholder_id || "" : ""} className="admin-input"><option value="">Aucune</option>{stakeholders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Audience (si non listee)<input name="audience" defaultValue={editing !== "new" ? editing.audience || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Message<textarea name="message" rows={2} defaultValue={editing !== "new" ? editing.message || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Canal<select name="channel" defaultValue={editing !== "new" ? editing.channel : "email"} className="admin-input">{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Frequence<input name="frequency" defaultValue={editing !== "new" ? editing.frequency || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel="Nom du responsable" placeholder="Selectionner un membre du staff..." /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "planned"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Prochaine echeance<input name="next_date" type="date" defaultValue={editing !== "new" ? editing.next_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Derniere diffusion<input name="last_sent_date" type="date" defaultValue={editing !== "new" ? editing.last_sent_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
