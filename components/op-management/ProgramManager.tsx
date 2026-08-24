"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Portfolio, PPMResource, Program, PPMStatus } from "@/lib/ppm/types";

const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

export default function ProgramManager({ initial, portfolios, portfolioId, staff = [] }: { initial: Program[]; portfolios: Portfolio[]; portfolioId?: string; staff?: PPMResource[] }) {
  const { en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const portfolioName = (id: string) => portfolios.find(item => item.id === id)?.name || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const portfolio = portfolios.find(item => item.id === String(form.get("portfolio_id") || ""));
    if (!portfolio) { setSaving(false); setMessage(en ? "Select a valid portfolio." : "Selectionnez un portefeuille valide."); return; }
    const payload = {
      portfolio_id: portfolio.id,
      organization_id: portfolio.organization_id,
      name: String(form.get("name") || "").trim(),
      code: String(form.get("code") || "").trim() || null,
      description: String(form.get("description") || "").trim() || null,
      overall_objective: String(form.get("overall_objective") || "").trim() || null,
      expected_results: String(form.get("expected_results") || "").trim() || null,
      manager_name: String(form.get("manager_name") || "").trim() || null,
      manager_email: String(form.get("manager_email") || "").trim() || null,
      donors: splitList(String(form.get("donors") || "")),
      partners: splitList(String(form.get("partners") || "")),
      target_population: String(form.get("target_population") || "").trim() || null,
      intervention_area: String(form.get("intervention_area") || "").trim() || null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      budget: form.get("budget") ? Number(form.get("budget")) : null,
      currency: String(form.get("currency") || "XAF"),
      status: String(form.get("status") || "active") as PPMStatus,
      progress_percent: form.get("progress_percent") ? Number(form.get("progress_percent")) : null,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const isNew = editing === "new";
    const { data: { user } } = await supabase.auth.getUser();
    const result = isNew
      ? await supabase.from("ppm_programs").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_programs").update(payload).eq("id", (editing as Program).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("ppm_history").insert({
      entity_type: "program", entity_id: result.data.id, actor_id: user?.id,
      action: isNew ? "Programme cree" : "Programme modifie",
      to_status: payload.status, note: payload.name,
    });
    setRows(current => isNew ? [...current, result.data as Program].sort((a, b) => a.name.localeCompare(b.name)) : current.map(row => row.id === result.data.id ? result.data as Program : row));
    setEditing(null);
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">{en ? "Programs" : "Programmes"}</h1><p className="mt-1 text-sm text-slate-500">{rows.length} {en ? "program(s) registered" : "programme(s) enregistre(s)"}</p></div>
      <button onClick={() => setEditing("new")} disabled={!portfolios.length} className="btn-primary disabled:opacity-40"><PlusIcon className="mr-2 h-5" />{en ? "New program" : "Nouveau programme"}</button>
    </div>
    {!portfolios.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "Create a portfolio first before adding a program." : "Creez d'abord un portefeuille avant d'ajouter un programme."}</p>}

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Name" : "Nom"}</th><th className="p-4">{en ? "Portfolio" : "Portefeuille"}</th><th className="p-4">{en ? "Progress" : "Progression"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.code && <span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span>}</td>
            <td className="p-4">{portfolioName(row.portfolio_id)}</td>
            <td className="p-4">{row.progress_percent != null ? `${row.progress_percent}%` : "—"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><Link href={`/op-management/programmes/${row.id}`} className="btn-secondary px-3 py-2 text-xs">{en ? "Open" : "Ouvrir"}</Link><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">{en ? "No programs yet." : "Aucun programme pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New program" : "Nouveau programme") : (en ? "Edit program" : "Modifier le programme")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Portfolio" : "Portefeuille"}<select name="portfolio_id" defaultValue={editing !== "new" ? editing.portfolio_id : portfolioId || ""} required className="admin-input"><option value="">{en ? "Select" : "Selectionner"}</option>{portfolios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Code<input name="code" defaultValue={editing !== "new" ? editing.code || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Overall objective" : "Objectif general"}<textarea name="overall_objective" rows={2} defaultValue={editing !== "new" ? editing.overall_objective || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Expected results" : "Resultats attendus"}<textarea name="expected_results" rows={2} defaultValue={editing !== "new" ? editing.expected_results || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Manager" : "Responsable"}<SearchableSelect name="manager_name" options={staffOptions} defaultValue={editing !== "new" ? editing.manager_name || "" : ""} allowOther otherLabel={en ? "Manager name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Manager email" : "Email du responsable"}<input name="manager_email" type="email" defaultValue={editing !== "new" ? editing.manager_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Donors (comma-separated)" : "Bailleurs (separes par des virgules)"}<input name="donors" defaultValue={editing !== "new" ? (editing.donors || []).join(", ") : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Partners (comma-separated)" : "Partenaires (separes par des virgules)"}<input name="partners" defaultValue={editing !== "new" ? (editing.partners || []).join(", ") : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Target population" : "Population cible"}<input name="target_population" defaultValue={editing !== "new" ? editing.target_population || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Intervention area" : "Zone d'intervention"}<input name="intervention_area" defaultValue={editing !== "new" ? editing.intervention_area || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="start_date" type="date" defaultValue={editing !== "new" ? editing.start_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="end_date" type="date" defaultValue={editing !== "new" ? editing.end_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Budget<input name="budget" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.budget ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Progress (%)" : "Progression (%)"}<input name="progress_percent" type="number" min="0" max="100" defaultValue={editing !== "new" ? editing.progress_percent ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">{en ? "Draft" : "Brouillon"}</option><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "On hold" : "En pause"}</option><option value="closed">{en ? "Closed" : "Cloture"}</option><option value="cancelled">{en ? "Cancelled" : "Annule"}</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
