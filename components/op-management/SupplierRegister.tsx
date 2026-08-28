"use client";
// Refinement program, Wave 1: Suppliers get a real directory instead of a free-text name on
// expenses/procurement, feeding a dropdown everywhere a supplier needs to be selected.
import { useState, type FormEvent } from "react";
import { PlusIcon, TruckIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import PPMFormModal from "@/components/op-management/PPMFormModal";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OrganizationSupplier, PPMStatus, ProjectContract, Supplier, SupplierCategory } from "@/lib/ppm/types";

const categoryLabels: Record<SupplierCategory, { fr: string; en: string }> = {
  goods: { fr: "Biens/Fournitures", en: "Goods/Supplies" }, services: { fr: "Services", en: "Services" },
  works: { fr: "Travaux", en: "Works" }, consultancy: { fr: "Consultance", en: "Consultancy" },
  logistics: { fr: "Logistique", en: "Logistics" }, other: { fr: "Autre", en: "Other" },
};

export default function SupplierRegister({ projectId, initial, orgSuppliers = [], contracts = [] }: { projectId: string; initial: Supplier[]; orgSuppliers?: OrganizationSupplier[]; contracts?: ProjectContract[] }) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [contactNameValue, setContactNameValue] = useState("");
  const [contactEmailValue, setContactEmailValue] = useState("");
  const [contactPhoneValue, setContactPhoneValue] = useState("");
  const [addressValue, setAddressValue] = useState("");
  const [selectedOrgSupplierId, setSelectedOrgSupplierId] = useState("");
  const orgSupplierOptions = orgSuppliers.map(item => ({ value: item.id, label: item.name, hint: item.category || undefined }));

  function openEditing(row: Supplier | "new") {
    setMessage("");
    setNameValue(row !== "new" ? row.name : "");
    setContactNameValue(row !== "new" ? row.contact_name || "" : "");
    setContactEmailValue(row !== "new" ? row.contact_email || "" : "");
    setContactPhoneValue(row !== "new" ? row.contact_phone || "" : "");
    setAddressValue(row !== "new" ? row.address || "" : "");
    setSelectedOrgSupplierId(row !== "new" ? orgSuppliers.find(item => item.name === row.name)?.id || "" : "");
    setEditing(row);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      name: String(form.get("name") || "").trim(),
      category: String(form.get("category") || "goods") as SupplierCategory,
      contact_name: String(form.get("contact_name") || "").trim() || null,
      contact_email: String(form.get("contact_email") || "").trim() || null,
      contact_phone: String(form.get("contact_phone") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      tax_id: String(form.get("tax_id") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_suppliers").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_suppliers").update(payload).eq("id", (editing as Supplier).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as Supplier] : current.map(row => row.id === result.data.id ? result.data as Supplier : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Suppliers" : "Fournisseurs"}</h2><button onClick={() => openEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New supplier" : "Nouveau fournisseur"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Supplier" : "Fournisseur"}</th><th className="p-4">{en ? "Category" : "Categorie"}</th><th className="p-4">Contact</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.tax_id && <p className="mt-1 text-xs text-slate-400">{en ? "Tax ID" : "NIU/RC"} : {row.tax_id}</p>}</td>
            <td className="p-4">{categoryLabels[row.category][locale]}</td>
            <td className="p-4">{row.contact_name || "—"}{row.contact_email && <p className="mt-1 text-xs text-slate-400">{row.contact_email}</p>}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><button onClick={() => openEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">{en ? "No suppliers registered." : "Aucun fournisseur enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <PPMFormModal icon={TruckIcon} title={editing === "new" ? (en ? "New supplier" : "Nouveau fournisseur") : (en ? "Edit supplier" : "Modifier le fournisseur")} onClose={() => setEditing(null)}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {!!orgSupplierOptions.length && <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Fill in from the organization directory (optional)" : "Renseigner depuis l'annuaire de l'organisation (facultatif)"}<SearchableSelect name="org_supplier_pick" options={orgSupplierOptions} defaultValue={selectedOrgSupplierId} placeholder={en ? "Select..." : "Selectionner..."} onChange={value => { setSelectedOrgSupplierId(value); const picked = orgSuppliers.find(item => item.id === value); if (picked) { setNameValue(picked.name); setContactNameValue(picked.contact_name || ""); setContactEmailValue(picked.contact_email || ""); setContactPhoneValue(picked.contact_phone || ""); setAddressValue(picked.address || ""); } }} /></label>}
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Name" : "Nom"}<input name="name" value={nameValue} onChange={event => setNameValue(event.target.value)} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue={editing !== "new" ? editing.category : "goods"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Tax ID / Trade Registry" : "NIU / Registre de commerce"}<input name="tax_id" defaultValue={editing !== "new" ? editing.tax_id || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Contract No." : "Contrat N*"}<input value={contracts.filter(item => item.party_type === "supplier" && (item.party_id === selectedOrgSupplierId || item.party_name === nameValue)).map(item => item.contract_number).join(", ")} readOnly className="admin-input bg-slate-100" /></label><input type="hidden" name="contact_name" value={contactNameValue}/>
        <label className="grid gap-2 text-sm font-bold">{en ? "Phone" : "Telephone"}<input name="contact_phone" value={contactPhoneValue} readOnly className="admin-input bg-slate-100" /></label>
        <label className="grid gap-2 text-sm font-bold">Email<input name="contact_email" type="email" value={contactEmailValue} readOnly className="admin-input bg-slate-100" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">{en ? "Draft" : "Brouillon"}</option><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "On hold" : "En pause"}</option><option value="closed">{en ? "Closed" : "Cloture"}</option><option value="cancelled">{en ? "Cancelled" : "Annule"}</option></select></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Address" : "Adresse"}<input name="address" value={addressValue} readOnly className="admin-input bg-slate-100" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
      </form>
    </PPMFormModal>}
  </div>;
}
