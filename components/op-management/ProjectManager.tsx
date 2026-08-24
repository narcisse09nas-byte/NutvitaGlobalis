"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Portfolio, PPMResource, Program, PPMStatus, Project, ProjectPriority, ProjectType } from "@/lib/ppm/types";

const typeLabels: Record<ProjectType, { fr: string; en: string }> = {
  development: { fr: "Developpement", en: "Development" }, humanitarian: { fr: "Humanitaire", en: "Humanitarian" },
  health: { fr: "Sante", en: "Health" }, nutrition: { fr: "Nutrition", en: "Nutrition" },
  food_security: { fr: "Securite alimentaire", en: "Food security" }, research: { fr: "Recherche", en: "Research" },
  other: { fr: "Autre", en: "Other" },
};
const priorityLabels: Record<ProjectPriority, { fr: string; en: string }> = {
  low: { fr: "Faible", en: "Low" }, medium: { fr: "Moyenne", en: "Medium" }, high: { fr: "Elevee", en: "High" }, critical: { fr: "Critique", en: "Critical" },
};

export default function ProjectManager({ initial, portfolios, programs, portfolioId, programId, staff = [] }: {
  initial: Project[]; portfolios: Portfolio[]; programs: Program[]; portfolioId?: string; programId?: string; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
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
    if (!portfolio) { setSaving(false); setMessage(en ? "Select a valid portfolio." : "Selectionnez un portefeuille valide."); return; }
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
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
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
      <div><h1 className="text-3xl font-black text-forest">{en ? "Projects" : "Projets"}</h1><p className="mt-1 text-sm text-slate-500">{rows.length} {en ? "project(s) registered" : "projet(s) enregistre(s)"}</p></div>
      <button onClick={() => setCreating(true)} disabled={!portfolios.length} className="btn-primary disabled:opacity-40"><PlusIcon className="mr-2 h-5" />{en ? "New project" : "Nouveau projet"}</button>
    </div>
    {!portfolios.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "Create a portfolio first before adding a project." : "Creez d'abord un portefeuille avant d'ajouter un projet."}</p>}

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Name" : "Nom"}</th><th className="p-4">{en ? "Portfolio" : "Portefeuille"}</th><th className="p-4">Type</th><th className="p-4">{en ? "Priority" : "Priorite"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.code && <span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span>}</td>
            <td className="p-4">{portfolioName(row.portfolio_id)}</td>
            <td className="p-4">{typeLabels[row.type][locale]}</td>
            <td className="p-4">{priorityLabels[row.priority][locale]}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><Link href={`/op-management/projets/${row.id}`} className="btn-secondary px-3 py-2 text-xs">{en ? "Open record" : "Ouvrir la fiche"}</Link></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No projects yet." : "Aucun projet pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "New project" : "Nouveau projet"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <p className="mt-2 text-sm text-slate-500">{en ? "Fill in the essential identification — the full scoping (context, charter, requirements, scope) is completed afterwards from the project record." : "Renseignez l'identification essentielle — le cadrage complet (contexte, charte, exigences, perimetre) se complete ensuite depuis la fiche projet."}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Project name" : "Nom du projet"}<input name="name" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Portfolio" : "Portefeuille"}<select name="portfolio_id" required defaultValue={portfolioId || ""} onChange={event => setSelectedPortfolio(event.target.value)} className="admin-input"><option value="">{en ? "Select" : "Selectionner"}</option>{portfolios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Program (optional)" : "Programme (facultatif)"}<select name="program_id" defaultValue={programId || ""} className="admin-input"><option value="">{en ? "None — attached directly to the portfolio" : "Aucun — rattache directement au portefeuille"}</option>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Code<input name="code" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Acronym" : "Acronyme"}<input name="acronym" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue="other" className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Priority" : "Priorite"}<select name="priority" defaultValue="medium" className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Project manager" : "Chef de projet"}<SearchableSelect name="project_manager_name" options={staffOptions} allowOther otherLabel={en ? "Project manager name" : "Nom du chef de projet"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Project manager email" : "Email du chef de projet"}<input name="project_manager_email" type="email" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="start_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="end_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Country" : "Pays"}<input name="country" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Total budget" : "Budget global"}<input name="total_budget" type="number" min="0" step="0.01" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue="XAF" className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create project" : "Creer le projet")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
