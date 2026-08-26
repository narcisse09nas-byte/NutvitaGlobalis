"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { nextSequence } from "@/lib/ppm/ids";
import type { OrganizationUnit, OrgRegistryStatus, OrgUnitType } from "@/lib/ppm/types";

const unitTypeLabels: Record<OrgUnitType, { fr: string; en: string }> = {
  department: { fr: "Departement", en: "Department" }, directorate: { fr: "Direction", en: "Directorate" },
  field_office: { fr: "Bureau terrain", en: "Field office" }, other: { fr: "Autre", en: "Other" },
};

export default function OrganizationUnitManager({ organizationId, initial }: { organizationId: string; initial: OrganizationUnit[] }) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<OrganizationUnit | "new" | null>(null);
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
      unit_type: String(form.get("unit_type") || "") as OrgUnitType || null,
      head_name: String(form.get("head_name") || "").trim() || null,
      status: String(form.get("status") || "active") as OrgRegistryStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const seq = await nextSequence(supabase, organizationId, "org_unit");
      result = await supabase.from("ppm_organization_units").insert({ ...payload, code: `UNIT-${String(seq).padStart(3, "0")}`, created_by: user?.id }).select("*").single();
    } else {
      result = await supabase.from("ppm_organization_units").update(payload).eq("id", (editing as OrganizationUnit).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as OrganizationUnit;
    setRows(current => isNew ? [...current, saved].sort((a, b) => a.name.localeCompare(b.name)) : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-forest">{en ? "Organizational units" : "Unites rattachees"}</h2><button onClick={() => setEditing("new")} className="btn-secondary px-3 py-2 text-xs"><PlusIcon className="mr-1 h-4" />{en ? "New unit" : "Nouvelle unite"}</button></div>
    <div className="grid gap-2">
      {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
        <span>{row.code && <span className="mr-2 font-mono text-xs text-slate-400">{row.code}</span>}<b className="text-forest">{row.name}</b>{row.unit_type ? ` — ${unitTypeLabels[row.unit_type][locale]}` : ""}{row.head_name ? ` · ${row.head_name}` : ""}</span>
        <button onClick={() => setEditing(row)} className="text-xs font-bold text-leaf">{en ? "Edit" : "Modifier"}</button>
      </div>)}
      {!rows.length && <p className="text-sm text-slate-400">{en ? "No unit registered." : "Aucune unite enregistree."}</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New unit" : "Nouvelle unite") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Type" : "Type"}<select name="unit_type" defaultValue={editing !== "new" ? editing.unit_type || "" : ""} className="admin-input"><option value="">—</option>{Object.entries(unitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Head" : "Responsable"}<input name="head_name" defaultValue={editing !== "new" ? editing.head_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="active">{en ? "Active" : "Actif"}</option><option value="inactive">{en ? "Inactive" : "Inactif"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
