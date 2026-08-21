"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { GovernanceRole, GovernanceRoleType } from "@/lib/ppm/types";

export const roleTypeLabels: Record<GovernanceRoleType, string> = {
  sponsor: "Sponsor", steering_committee: "Steering Committee", project_director: "Project Director",
  project_manager: "Project Manager", technical_lead: "Technical Lead", finance: "Finance",
  procurement: "Procurement", meal: "MEAL", qa: "QA", other: "Autre",
};

export default function GovernanceManager({ projectId, initial }: { projectId: string; initial: GovernanceRole[] }) {
  const [rows, setRows] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) { setSaving(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_governance_roles").insert({
      project_id: projectId,
      role_type: String(form.get("role_type") || "other") as GovernanceRoleType,
      role_label: String(form.get("role_label") || "").trim() || null,
      name, email: String(form.get("email") || "").trim() || null,
      organization: String(form.get("organization") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      created_by: user?.id,
    }).select("*").single();
    setSaving(false);
    if (!result.error) setRows(current => [...current, result.data as GovernanceRole]);
    setAdding(false);
  }

  async function remove(id: string) {
    if (!confirm("Retirer ce responsable de la gouvernance ?")) return;
    await createClient().from("ppm_governance_roles").delete().eq("id", id);
    setRows(current => current.filter(row => row.id !== id));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Gouvernance du projet</h2><button onClick={() => setAdding(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Ajouter un responsable</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Role</th><th className="p-4">Nom</th><th className="p-4">Email</th><th className="p-4">Organisation</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-forest">{row.role_label || roleTypeLabels[row.role_type]}</span></td>
            <td className="p-4 font-bold text-forest">{row.name}</td>
            <td className="p-4">{row.email || "—"}</td>
            <td className="p-4">{row.organization || "—"}</td>
            <td className="p-4"><button onClick={() => remove(row.id)} aria-label="Retirer" className="rounded-lg border border-red-200 p-1.5 text-red-600"><TrashIcon className="h-4" /></button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun responsable de gouvernance enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {adding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Ajouter un responsable</h2><button type="button" onClick={() => setAdding(false)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Role<select name="role_type" className="admin-input">{Object.entries(roleTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Libelle personnalise (facultatif)<input name="role_label" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Nom<input name="name" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Organisation<input name="organization" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} className="admin-input" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAdding(false)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Ajout..." : "Ajouter"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
