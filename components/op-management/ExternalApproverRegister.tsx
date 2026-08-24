"use client";
// Refinement program, Wave 8 (item 43): a real directory of people outside the project who
// approve deliverables/documents, feeding the approver dropdown on ApprovalRequestManager and the
// "accepted by" dropdown on DeliverableManager, instead of free-typing a name+email every time.
import { useState, type FormEvent } from "react";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import PPMFormModal from "@/components/op-management/PPMFormModal";
import type { ExternalApprover } from "@/lib/ppm/types";

export default function ExternalApproverRegister({ projectId, initial }: { projectId: string; initial: ExternalApprover[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<ExternalApprover | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      organization: String(form.get("organization") || "").trim() || null,
      role_title: String(form.get("role_title") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.name || !payload.email) { setSaving(false); setMessage("Le nom et l'email sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_external_approvers").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_external_approvers").update(payload).eq("id", (editing as ExternalApprover).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as ExternalApprover] : current.map(row => row.id === result.data.id ? result.data as ExternalApprover : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Approbateurs externes</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvel approbateur</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Nom</th><th className="p-4">Organisation</th><th className="p-4">Email</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.role_title && <p className="mt-1 text-xs text-slate-400">{row.role_title}</p>}</td>
            <td className="p-4">{row.organization || "—"}</td>
            <td className="p-4">{row.email}</td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={4} className="p-10 text-center text-slate-400">Aucun approbateur externe enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <PPMFormModal icon={UserIcon} title={editing === "new" ? "Nouvel approbateur externe" : "Modifier l'approbateur"} onClose={() => setEditing(null)}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" defaultValue={editing !== "new" ? editing.email : ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Fonction<input name="role_title" defaultValue={editing !== "new" ? editing.role_title || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Organisation<input name="organization" defaultValue={editing !== "new" ? editing.organization || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
      </form>
    </PPMFormModal>}
  </div>;
}
