"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Organization, PPMStatus } from "@/lib/ppm/types";

export default function OrganizationManager({ initial }: { initial: Organization[] }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Organization | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      code: String(form.get("code") || "").trim() || null,
      description: String(form.get("description") || "").trim() || null,
      country: String(form.get("country") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const isNew = editing === "new";
    const { data: { user } } = await supabase.auth.getUser();
    const result = isNew
      ? await supabase.from("ppm_organizations").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_organizations").update(payload).eq("id", (editing as Organization).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("ppm_history").insert({
      entity_type: "organization", entity_id: result.data.id, actor_id: user?.id,
      action: isNew ? "Organisation creee" : "Organisation modifiee",
      to_status: payload.status, note: payload.name,
    });
    setRows(current => isNew ? [...current, result.data as Organization].sort((a, b) => a.name.localeCompare(b.name)) : current.map(row => row.id === result.data.id ? result.data as Organization : row));
    setEditing(null);
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">{en ? "Organizations" : "Organisations"}</h1><p className="mt-1 text-sm text-slate-500">{rows.length} {en ? "organization(s) registered" : "organisation(s) enregistree(s)"}</p></div>
      <button onClick={() => setEditing("new")} className="btn-primary"><PlusIcon className="mr-2 h-5" />{en ? "New organization" : "Nouvelle organisation"}</button>
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Name" : "Nom"}</th><th className="p-4">Code</th><th className="p-4">{en ? "Country" : "Pays"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">{en ? "Action" : "Action"}</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.description && <p className="mt-1 max-w-md text-xs text-slate-500">{row.description}</p>}</td>
            <td className="p-4 font-mono text-xs">{row.code || "—"}</td>
            <td className="p-4">{row.country || "—"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><Link href={`/op-management/organisations/${row.id}`} className="btn-secondary px-3 py-2 text-xs">{en ? "Open" : "Ouvrir"}</Link><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">{en ? "No organizations yet. Create the first one to get started." : "Aucune organisation. Creez la premiere pour commencer."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New organization" : "Nouvelle organisation") : (en ? "Edit organization" : "Modifier l'organisation")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Code<input name="code" defaultValue={editing !== "new" ? editing.code || "" : ""} className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Country" : "Pays"}<input name="country" defaultValue={editing !== "new" ? editing.country || "" : ""} className="admin-input" /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={3} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">{en ? "Draft" : "Brouillon"}</option><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "On hold" : "En pause"}</option><option value="closed">{en ? "Closed" : "Cloture"}</option><option value="cancelled">{en ? "Cancelled" : "Annule"}</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
