"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { nextSequence } from "@/lib/ppm/ids";
import type { OrganizationSupplier, OrgRegistryStatus } from "@/lib/ppm/types";

export default function OrganizationSupplierManager({ organizationId, initial }: { organizationId: string; initial: OrganizationSupplier[] }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<OrganizationSupplier | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      organization_id: organizationId,
      name: String(form.get("name") || "").trim(),
      category: String(form.get("category") || "").trim() || null,
      contact_name: String(form.get("contact_name") || "").trim() || null,
      contact_email: String(form.get("contact_email") || "").trim() || null,
      contact_phone: String(form.get("contact_phone") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      status: String(form.get("status") || "active") as OrgRegistryStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const seq = await nextSequence(supabase, organizationId, "org_supplier").catch(() => null);
      const code = seq ? `SUP-${String(seq).padStart(3, "0")}` : null;
      result = await supabase.from("ppm_organization_suppliers").insert({ ...payload, code, created_by: user?.id }).select("*").single();
    } else {
      result = await supabase.from("ppm_organization_suppliers").update(payload).eq("id", (editing as OrganizationSupplier).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as OrganizationSupplier;
    setRows(current => isNew ? [...current, saved].sort((a, b) => a.name.localeCompare(b.name)) : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-forest">{en ? "Strategic suppliers" : "Fournisseurs strategiques"}</h2><button onClick={() => setEditing("new")} className="btn-secondary px-3 py-2 text-xs"><PlusIcon className="mr-1 h-4" />{en ? "New supplier" : "Nouveau fournisseur"}</button></div>
    <div className="grid gap-2">
      {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
        <span>{row.code && <span className="mr-2 font-mono text-xs text-slate-400">{row.code}</span>}<b className="text-forest">{row.name}</b>{row.category ? ` — ${row.category}` : ""}{row.contact_email ? ` · ${row.contact_email}` : ""}</span>
        <button onClick={() => setEditing(row)} className="text-xs font-bold text-leaf">{en ? "Edit" : "Modifier"}</button>
      </div>)}
      {!rows.length && <p className="text-sm text-slate-400">{en ? "No supplier registered." : "Aucun fournisseur enregistre."}</p>}
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New supplier" : "Nouveau fournisseur") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<input name="category" defaultValue={editing !== "new" ? editing.category || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Contact name" : "Nom du contact"}<input name="contact_name" defaultValue={editing !== "new" ? editing.contact_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Contact email" : "Email du contact"}<input name="contact_email" type="email" defaultValue={editing !== "new" ? editing.contact_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Contact phone" : "Telephone du contact"}<input name="contact_phone" defaultValue={editing !== "new" ? editing.contact_phone || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Address" : "Adresse"}<input name="address" defaultValue={editing !== "new" ? editing.address || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="active">{en ? "Active" : "Actif"}</option><option value="inactive">{en ? "Inactive" : "Inactif"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
