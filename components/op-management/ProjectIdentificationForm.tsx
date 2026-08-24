"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Portfolio, Program, Project, ProjectPriority, ProjectType } from "@/lib/ppm/types";

const typeLabels: Record<ProjectType, string> = {
  development: "Developpement", humanitarian: "Humanitaire", health: "Sante", nutrition: "Nutrition",
  food_security: "Securite alimentaire", research: "Recherche", other: "Autre",
};
const priorityLabels: Record<ProjectPriority, string> = { low: "Faible", medium: "Moyenne", high: "Elevee", critical: "Critique" };
const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

// Refinement program, Wave 2: duration is derived from the date range, never typed independently —
// a manually-entered number next to two dates could silently drift from the actual span.
function monthsBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate < startDate) return null;
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  const dayAdjustment = endDate.getDate() >= startDate.getDate() ? 0 : -1;
  return Math.max(1, months + dayAdjustment + 1);
}

export default function ProjectIdentificationForm({ project, portfolios, programs }: { project: Project; portfolios: Portfolio[]; programs: Program[] }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [portfolioId, setPortfolioId] = useState(project.portfolio_id);
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [endDate, setEndDate] = useState(project.end_date || "");
  const availablePrograms = programs.filter(item => item.portfolio_id === portfolioId);
  const computedDuration = monthsBetween(startDate, endDate);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const portfolio = portfolios.find(item => item.id === String(form.get("portfolio_id") || ""));
    if (!portfolio) { setSaving(false); setMessage("Portefeuille invalide."); return; }
    const payload = {
      name: String(form.get("name") || "").trim(),
      code: String(form.get("code") || "").trim() || null,
      acronym: String(form.get("acronym") || "").trim() || null,
      short_description: String(form.get("short_description") || "").trim() || null,
      type: String(form.get("type") || "other") as ProjectType,
      priority: String(form.get("priority") || "medium") as ProjectPriority,
      portfolio_id: portfolio.id,
      program_id: String(form.get("program_id") || "") || null,
      organization_id: portfolio.organization_id,
      project_manager_name: String(form.get("project_manager_name") || "").trim() || null,
      project_manager_email: String(form.get("project_manager_email") || "").trim() || null,
      sponsor_name: String(form.get("sponsor_name") || "").trim() || null,
      sponsor_email: String(form.get("sponsor_email") || "").trim() || null,
      responsible_unit: String(form.get("responsible_unit") || "").trim() || null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      duration_months: monthsBetween(String(form.get("start_date") || ""), String(form.get("end_date") || "")),
      country: String(form.get("country") || "").trim() || null,
      regions: splitList(String(form.get("regions") || "")),
      sites: splitList(String(form.get("sites") || "")),
      target_population: String(form.get("target_population") || "").trim() || null,
      direct_beneficiaries: form.get("direct_beneficiaries") ? Number(form.get("direct_beneficiaries")) : null,
      indirect_beneficiaries: form.get("indirect_beneficiaries") ? Number(form.get("indirect_beneficiaries")) : null,
      donor_name: String(form.get("donor_name") || "").trim() || null,
      grant_award_id: String(form.get("grant_award_id") || "").trim() || null,
      total_budget: form.get("total_budget") ? Number(form.get("total_budget")) : null,
      currency: String(form.get("currency") || "XAF"),
    };
    if (!payload.name) { setSaving(false); setMessage("Le nom est obligatoire."); return; }
    const supabase = createClient();
    const result = await supabase.from("ppm_projects").update(payload).eq("id", project.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage("Identification enregistree.");
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom du projet<input name="name" defaultValue={project.name} required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description courte<textarea name="short_description" rows={2} defaultValue={project.short_description || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Code<input name="code" defaultValue={project.code || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Acronyme<input name="acronym" defaultValue={project.acronym || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue={project.type} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Priorite<select name="priority" defaultValue={project.priority} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Portefeuille<select name="portfolio_id" defaultValue={project.portfolio_id} onChange={event => setPortfolioId(event.target.value)} required className="admin-input">{portfolios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Programme (facultatif)<select name="program_id" defaultValue={project.program_id || ""} className="admin-input"><option value="">Aucun</option>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">Chef de projet<input name="project_manager_name" defaultValue={project.project_manager_name || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Email chef de projet<input name="project_manager_email" type="email" defaultValue={project.project_manager_email || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Sponsor<input name="sponsor_name" defaultValue={project.sponsor_name || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Email sponsor<input name="sponsor_email" type="email" defaultValue={project.sponsor_email || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Unite responsable<input name="responsible_unit" defaultValue={project.responsible_unit || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Duree (mois) — calculee automatiquement<input disabled value={computedDuration ?? "—"} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Date de debut<input name="start_date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Date de fin<input name="end_date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Pays<input name="country" defaultValue={project.country || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Regions (separees par des virgules)<input name="regions" defaultValue={(project.regions || []).join(", ")} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">Zones / sites (separes par des virgules)<input name="sites" defaultValue={(project.sites || []).join(", ")} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">Population cible<input name="target_population" defaultValue={project.target_population || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Beneficiaires directs<input name="direct_beneficiaries" type="number" min="0" defaultValue={project.direct_beneficiaries ?? ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Beneficiaires indirects<input name="indirect_beneficiaries" type="number" min="0" defaultValue={project.indirect_beneficiaries ?? ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Bailleur<input name="donor_name" defaultValue={project.donor_name || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Grant / Award ID<input name="grant_award_id" defaultValue={project.grant_award_id || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Budget global<input name="total_budget" type="number" min="0" step="0.01" defaultValue={project.total_budget ?? ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue={project.currency || "XAF"} className="admin-input" /></label>
    </div>
    {message && <p className="rounded-xl bg-mint p-3 text-sm font-bold text-forest">{message}</p>}
    <div className="flex justify-end"><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer l'identification"}</button></div>
  </form>;
}
