"use client";
// Refinement program, Wave 1: Suppliers get a real directory instead of a free-text name on
// expenses/procurement, feeding a dropdown everywhere a supplier needs to be selected.
import { useState, type FormEvent } from "react";
import { PlusIcon, TruckIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import PPMFormModal from "@/components/op-management/PPMFormModal";
import type { PPMStatus, Supplier, SupplierCategory } from "@/lib/ppm/types";

const categoryLabels: Record<SupplierCategory, string> = {
  goods: "Biens/Fournitures", services: "Services", works: "Travaux", consultancy: "Consultance", logistics: "Logistique", other: "Autre",
};

export default function SupplierRegister({ projectId, initial }: { projectId: string; initial: Supplier[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
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
      category: String(form.get("category") || "goods") as SupplierCategory,
      contact_name: String(form.get("contact_name") || "").trim() || null,
      contact_email: String(form.get("contact_email") || "").trim() || null,
      contact_phone: String(form.get("contact_phone") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      tax_id: String(form.get("tax_id") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage("Le nom est obligatoire."); return; }
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
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Fournisseurs</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau fournisseur</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Fournisseur</th><th className="p-4">Categorie</th><th className="p-4">Contact</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.tax_id && <p className="mt-1 text-xs text-slate-400">NIU/RC : {row.tax_id}</p>}</td>
            <td className="p-4">{categoryLabels[row.category]}</td>
            <td className="p-4">{row.contact_name || "—"}{row.contact_email && <p className="mt-1 text-xs text-slate-400">{row.contact_email}</p>}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun fournisseur enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <PPMFormModal icon={TruckIcon} title={editing === "new" ? "Nouveau fournisseur" : "Modifier le fournisseur"} onClose={() => setEditing(null)}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Categorie<select name="category" defaultValue={editing !== "new" ? editing.category : "goods"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">NIU / Registre de commerce<input name="tax_id" defaultValue={editing !== "new" ? editing.tax_id || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Contact<input name="contact_name" defaultValue={editing !== "new" ? editing.contact_name || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Telephone<input name="contact_phone" defaultValue={editing !== "new" ? editing.contact_phone || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Email<input name="contact_email" type="email" defaultValue={editing !== "new" ? editing.contact_email || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">Brouillon</option><option value="active">Actif</option><option value="on_hold">En pause</option><option value="closed">Cloture</option><option value="cancelled">Annule</option></select></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Adresse<input name="address" defaultValue={editing !== "new" ? editing.address || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
      </form>
    </PPMFormModal>}
  </div>;
}
