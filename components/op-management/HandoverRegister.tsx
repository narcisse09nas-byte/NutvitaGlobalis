"use client";
// Refinement program, Wave 8 (item 48): Handover becomes a register (list + one dedicated form
// per item to transfer) instead of a single free-text section on the closure record — several
// items (equipment, keys, documents, contracts...) may need transferring, each with its own
// recipient and status.
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { HandoverItem, HandoverStatus } from "@/lib/ppm/types";

const statusLabels: Record<HandoverStatus, string> = { pending: "En attente", handed_over: "Transfere", acknowledged: "Accuse de reception" };
const statusTones: Record<HandoverStatus, string> = {
  pending: "bg-slate-100 text-slate-600", handed_over: "bg-sky-50 text-sky-800", acknowledged: "bg-mint text-forest",
};

export default function HandoverRegister({ projectId, initial }: { projectId: string; initial: HandoverItem[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<HandoverItem | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      recipient_name: String(form.get("recipient_name") || "").trim() || null,
      recipient_organization: String(form.get("recipient_organization") || "").trim() || null,
      handover_date: String(form.get("handover_date") || "") || null,
      status: String(form.get("status") || "pending") as HandoverStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const orgCode = await getOrgCodeForProject(supabase, projectId);
      result = await withUniqueRegistryCode<HandoverItem>(
        async code => await supabase.from("ppm_handover_items").insert({ ...payload, code, created_by: user?.id }).select("*").single(),
        () => generateRegistryCode(orgCode, "handover"),
      );
    } else {
      result = await supabase.from("ppm_handover_items").update(payload).eq("id", (editing as HandoverItem).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as HandoverItem, ...current] : current.map(row => row.id === result.data.id ? result.data as HandoverItem : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-forest">5. Transfert (handover)</h2><button type="button" onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvel element a transferer</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>{row.code && <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span>}<b className="text-forest">{row.title}</b>{row.recipient_name && <p className="mt-1 text-xs text-slate-400">Vers : {row.recipient_name}{row.recipient_organization ? ` (${row.recipient_organization})` : ""}</p>}</div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        <button type="button" onClick={() => setEditing(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">Modifier</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">Aucun element de transfert enregistre.</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? "Nouvel element a transferer" : "Modifier"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Titre (ex : cles du bureau, vehicule, dossier X)<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Transfere a<input name="recipient_name" defaultValue={editing !== "new" ? editing.recipient_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Organisation<input name="recipient_organization" defaultValue={editing !== "new" ? editing.recipient_organization || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de transfert<input name="handover_date" type="date" defaultValue={editing !== "new" ? editing.handover_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "pending"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
