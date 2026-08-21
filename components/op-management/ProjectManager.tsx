"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import type { Portfolio, Program, PPMStatus, Project, ProjectPriority, ProjectType } from "@/lib/ppm/types";

const typeLabels: Record<ProjectType, string> = {
  development: "Developpement", humanitarian: "Humanitaire", health: "Sante", nutrition: "Nutrition",
  food_security: "Securite alimentaire", research: "Recherche", other: "Autre",
};
const priorityLabels: Record<ProjectPriority, string> = { low: "Faible", medium: "Moyenne", high: "Elevee", critical: "Critique" };

export default function ProjectManager({ initial, portfolios, programs, portfolioId, programId }: {
  initial: Project[]; portfolios: Portfolio[]; programs: Program[]; portfolioId?: string; programId?: string;
}) {
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolioId || "");
  const portfolioName = (id: string) => portfolios.find(item => item.id === id)?.name || "—";
  const availablePrograms = programs.filter(item => !selectedPortfolio || item.portfolio_id === selectedPortfolio);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const portfolio = portfolios.find(item => item.id === String(form.get("portfolio_id") || ""));
    if (!portfolio) { setSaving(false); setMessage("Selectionnez un portefeuille valide."); return; }
    const programValue = String(form.get("program_id") || "") || null;
    const payload = {
      name: String(form.get("name") || "").trim(),
      code: String(form.get("code") || "").trim() || null,
      acronym: String(form.get("acronym") || "").trim() || null,
      type: String(form.get("type") || "other") as ProjectType,
      priority: String(form.get("priority") || "medium") as ProjectPriority,
      portfolio_id: portfolio.id,
      program_id: programValue,
      organization_id: portfolio.organization_id,
      project_manager_name: String(form.get("project_manager_name") || "").trim() || null,
      project_manager_email: String(form.get("project_manager_email") || "").trim() || null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      country: String(form.get("country") || "").trim() || null,
      total_budget: form.get("total_budget") ? Number(form.get("total_budget")) : null,
      currency: String(form.get("currency") || "XAF"),
      status: "draft" as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage("Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_projects").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: result.data.id, actor_id: user?.id, action: "Projet cree", to_status: payload.status, note: payload.name });
    setRows(current => [...current, result.data as Project].sort((a, b) => a.name.localeCompare(b.name)));
    setCreating(false);
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">Projets</h1><p className="mt-1 text-sm text-slate-500">{rows.length} projet(s) enregistre(s)</p></div>
      <button onClick={() => setCreating(true)} disabled={!portfolios.length} className="btn-primary disabled:opacity-40"><PlusIcon className="mr-2 h-5" />Nouveau projet</button>
    </div>
    {!portfolios.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Creez d&apos;abord un portefeuille avant d&apos;ajouter un projet.</p>}

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Nom</th><th className="p-4">Portefeuille</th><th className="p-4">Type</th><th className="p-4">Priorite</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.code && <span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span>}</td>
            <td className="p-4">{portfolioName(row.portfolio_id)}</td>
            <td className="p-4">{typeLabels[row.type]}</td>
            <td className="p-4">{priorityLabels[row.priority]}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><Link href={`/op-management/projets/${row.id}`} className="btn-secondary px-3 py-2 text-xs">Ouvrir la fiche</Link></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucun projet pour le moment.</td></tr>}
        </tbody>
      </table>
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">Nouveau projet</h2><button type="button" onClick={() => setCreating(false)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <p className="mt-2 text-sm text-slate-500">Renseignez l&apos;identification essentielle — le cadrage complet (contexte, charte, exigences, perimetre) se complete ensuite depuis la fiche projet.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom du projet<input name="name" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Portefeuille<select name="portfolio_id" required defaultValue={portfolioId || ""} onChange={event => setSelectedPortfolio(event.target.value)} className="admin-input"><option value="">Selectionner</option>{portfolios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Programme (facultatif)<select name="program_id" defaultValue={programId || ""} className="admin-input"><option value="">Aucun — rattache directement au portefeuille</option>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Code<input name="code" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Acronyme<input name="acronym" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue="other" className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Priorite<select name="priority" defaultValue="medium" className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Chef de projet<input name="project_manager_name" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email du chef de projet<input name="project_manager_email" type="email" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de debut<input name="start_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de fin<input name="end_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Pays<input name="country" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Budget global<input name="total_budget" type="number" min="0" step="0.01" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue="XAF" className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Creation..." : "Creer le projet"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
