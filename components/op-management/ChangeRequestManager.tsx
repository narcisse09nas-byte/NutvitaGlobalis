"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { ChangeRequest, ChangeRequestStatus } from "@/lib/ppm/types";

const statusLabels: Record<ChangeRequestStatus, string> = {
  draft: "Brouillon", submitted: "Soumise", impact_assessed: "Impact evalue",
  approved: "Approuvee", rejected: "Rejetee", implemented: "Mise en oeuvre",
};
const statusTones: Record<ChangeRequestStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-amber-50 text-amber-800", impact_assessed: "bg-sky-50 text-sky-800",
  approved: "bg-mint text-forest", rejected: "bg-red-50 text-red-700", implemented: "bg-forest text-white",
};
const impactFields: Array<[string, string]> = [
  ["impact_scope", "Perimetre"], ["impact_schedule", "Calendrier"], ["impact_budget", "Budget"],
  ["impact_resources", "Ressources"], ["impact_procurement", "Procurement"], ["impact_indicators", "Indicateurs"],
  ["impact_risks", "Risques"], ["impact_quality", "Qualite"],
];

export default function ChangeRequestManager({ projectId, initial }: { projectId: string; initial: ChangeRequest[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<ChangeRequest | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      project_id: projectId,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      requested_by_name: String(form.get("requested_by_name") || "").trim() || null,
    };
    for (const [key] of impactFields) payload[key] = String(form.get(key) || "").trim() || null;
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_change_requests").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_change_requests").update(payload).eq("id", (editing as ChangeRequest).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as ChangeRequest, ...current] : current.map(row => row.id === result.data.id ? result.data as ChangeRequest : row));
    setEditing(null);
  }

  async function setStatus(row: ChangeRequest, status: ChangeRequestStatus) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const extra = ["approved", "rejected"].includes(status) ? { decided_at: new Date().toISOString(), decided_by_name: user?.user_metadata?.full_name || user?.email } : {};
    const result = await supabase.from("ppm_change_requests").update({ status, ...extra }).eq("id", row.id).select("*").single();
    if (result.error) return;
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Change Request — ${statusLabels[status]}`, from_status: row.status, to_status: status, note: row.title });
    setRows(current => current.map(item => item.id === row.id ? result.data as ChangeRequest : item));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Change Control</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle demande de changement</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.title}</b>{row.requested_by_name && <p className="text-xs text-slate-400">Demande par {row.requested_by_name}</p>}</div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.description && <p className="mt-2 text-sm text-slate-600">{row.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {row.status === "draft" && <button onClick={() => setStatus(row, "submitted")} className="btn-secondary px-3 py-1.5 text-xs">Soumettre</button>}
          {row.status === "submitted" && <button onClick={() => setStatus(row, "impact_assessed")} className="btn-secondary px-3 py-1.5 text-xs">Marquer l&apos;impact evalue</button>}
          {row.status === "impact_assessed" && <><button onClick={() => setStatus(row, "approved")} className="btn-primary px-3 py-1.5 text-xs">Approuver</button><button onClick={() => setStatus(row, "rejected")} className="btn-secondary px-3 py-1.5 text-xs">Rejeter</button></>}
          {row.status === "approved" && <button onClick={() => setStatus(row, "implemented")} className="btn-primary px-3 py-1.5 text-xs">Marquer mise en oeuvre</button>}
          <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-1.5 text-xs">Modifier les impacts</button>
        </div>
        {(row.status === "approved" || row.status === "implemented") && (row.impact_scope || row.impact_schedule || row.impact_budget) && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
          Ce changement approuve modifie le perimetre, le calendrier ou le budget — <Link href={`/op-management/projets/${projectId}/suivi-controle/performance`} className="underline">creer une nouvelle version de la PMB →</Link>
        </p>}
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune demande de changement.</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvelle demande de changement" : "Modifier la demande"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Demande par<input name="requested_by_name" defaultValue={editing !== "new" ? editing.requested_by_name || "" : ""} className="admin-input" /></label>
          {impactFields.map(([key, label]) => <label key={key} className="grid gap-2 text-sm font-bold"><span>Impact — {label}</span><textarea name={key} rows={2} defaultValue={editing !== "new" ? (editing as unknown as Record<string, string>)[key] || "" : ""} className="admin-input" /></label>)}
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
