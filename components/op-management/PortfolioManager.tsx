"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import type { Organization, Portfolio, PPMStatus } from "@/lib/ppm/types";

export default function PortfolioManager({ initial, organizations, organizationId }: { initial: Portfolio[]; organizations: Organization[]; organizationId?: string }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Portfolio | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const organizationName = (id: string) => organizations.find(org => org.id === id)?.name || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      organization_id: String(form.get("organization_id") || ""),
      name: String(form.get("name") || "").trim(),
      code: String(form.get("code") || "").trim() || null,
      description: String(form.get("description") || "").trim() || null,
      strategic_objectives: String(form.get("strategic_objectives") || "").trim() || null,
      manager_name: String(form.get("manager_name") || "").trim() || null,
      manager_email: String(form.get("manager_email") || "").trim() || null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      total_budget: form.get("total_budget") ? Number(form.get("total_budget")) : null,
      currency: String(form.get("currency") || "XAF"),
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name || !payload.organization_id) { setSaving(false); setMessage("Le nom et l'organisation sont obligatoires."); return; }
    const supabase = createClient();
    const isNew = editing === "new";
    const { data: { user } } = await supabase.auth.getUser();
    const result = isNew
      ? await supabase.from("ppm_portfolios").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_portfolios").update(payload).eq("id", (editing as Portfolio).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("ppm_history").insert({
      entity_type: "portfolio", entity_id: result.data.id, actor_id: user?.id,
      action: isNew ? "Portefeuille cree" : "Portefeuille modifie",
      to_status: payload.status, note: payload.name,
    });
    setRows(current => isNew ? [...current, result.data as Portfolio].sort((a, b) => a.name.localeCompare(b.name)) : current.map(row => row.id === result.data.id ? result.data as Portfolio : row));
    setEditing(null);
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">Portefeuilles</h1><p className="mt-1 text-sm text-slate-500">{rows.length} portefeuille(s) enregistre(s)</p></div>
      <button onClick={() => setEditing("new")} disabled={!organizations.length} className="btn-primary disabled:opacity-40"><PlusIcon className="mr-2 h-5" />Nouveau portefeuille</button>
    </div>
    {!organizations.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Creez d&apos;abord une organisation avant d&apos;ajouter un portefeuille.</p>}

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Nom</th><th className="p-4">Organisation</th><th className="p-4">Budget</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.code && <span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span>}</td>
            <td className="p-4">{organizationName(row.organization_id)}</td>
            <td className="p-4">{row.total_budget ? `${row.total_budget.toLocaleString("fr-FR")} ${row.currency || ""}` : "—"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><Link href={`/op-management/portefeuilles/${row.id}`} className="btn-secondary px-3 py-2 text-xs">Ouvrir</Link><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun portefeuille pour le moment.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouveau portefeuille" : "Modifier le portefeuille"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Organisation<select name="organization_id" defaultValue={editing !== "new" ? editing.organization_id : organizationId || ""} required className="admin-input"><option value="">Selectionner</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Code<input name="code" defaultValue={editing !== "new" ? editing.code || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Objectifs strategiques<textarea name="strategic_objectives" rows={3} defaultValue={editing !== "new" ? editing.strategic_objectives || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="manager_name" defaultValue={editing !== "new" ? editing.manager_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email du responsable<input name="manager_email" type="email" defaultValue={editing !== "new" ? editing.manager_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de debut<input name="start_date" type="date" defaultValue={editing !== "new" ? editing.start_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de fin<input name="end_date" type="date" defaultValue={editing !== "new" ? editing.end_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Budget global<input name="total_budget" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.total_budget ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">Brouillon</option><option value="active">Actif</option><option value="on_hold">En pause</option><option value="closed">Cloture</option><option value="cancelled">Annule</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
