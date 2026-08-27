"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { nextSequence } from "@/lib/ppm/ids";
import type { OrganizationStaff, OrgRegistryStatus } from "@/lib/ppm/types";

export default function OrganizationStaffManager({ organizationId, initial }: { organizationId: string; initial: OrganizationStaff[] }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<OrganizationStaff | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      organization_id: organizationId,
      full_name: String(form.get("full_name") || "").trim(),
      role_title: String(form.get("role_title") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      status: String(form.get("status") || "active") as OrgRegistryStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.full_name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const seq = await nextSequence(supabase, organizationId, "org_staff");
      result = await supabase.from("ppm_organization_staff").insert({ ...payload, code: `STAFF-${String(seq).padStart(3, "0")}`, created_by: user?.id }).select("*").single();
    } else {
      result = await supabase.from("ppm_organization_staff").update(payload).eq("id", (editing as OrganizationStaff).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as OrganizationStaff;
    setRows(current => isNew ? [...current, saved].sort((a, b) => a.full_name.localeCompare(b.full_name)) : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-forest">{en ? "Organization staff" : "Personnel de l'organisation"}</h2><button onClick={() => setEditing("new")} className="btn-secondary px-3 py-2 text-xs"><PlusIcon className="mr-1 h-4" />{en ? "New staff member" : "Nouveau membre"}</button></div>
    <div className="grid gap-2">
      {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
        <span>{row.code && <span className="mr-2 font-mono text-xs text-slate-400">{row.code}</span>}<b className="text-forest">{row.full_name}</b>{row.role_title ? ` — ${row.role_title}` : ""}{row.email ? ` · ${row.email}` : ""}{row.status === "inactive" ? ` · ${en ? "inactive" : "inactif"}` : ""}</span>
        <button onClick={() => setEditing(row)} className="text-xs font-bold text-leaf">{en ? "Edit" : "Modifier"}</button>
      </div>)}
      {!rows.length && <p className="text-sm text-slate-400">{en ? "No staff member registered." : "Aucun membre du personnel enregistre."}</p>}
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New staff member" : "Nouveau membre") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Full name" : "Nom complet"}<input name="full_name" defaultValue={editing !== "new" ? editing.full_name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Role / title" : "Fonction"}<input name="role_title" defaultValue={editing !== "new" ? editing.role_title || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" defaultValue={editing !== "new" ? editing.email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Phone" : "Telephone"}<input name="phone" defaultValue={editing !== "new" ? editing.phone || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="active">{en ? "Active" : "Actif"}</option><option value="inactive">{en ? "Inactive" : "Inactif"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
