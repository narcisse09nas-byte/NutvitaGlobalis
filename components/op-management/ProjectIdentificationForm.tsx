"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OrganizationDonor, OrganizationStaff, OrganizationUnit, Portfolio, PPMResource, Program, Project, ProjectPriority, ProjectType } from "@/lib/ppm/types";

const typeLabels: Record<ProjectType, { fr: string; en: string }> = {
  development: { fr: "Developpement", en: "Development" }, humanitarian: { fr: "Humanitaire", en: "Humanitarian" },
  health: { fr: "Sante", en: "Health" }, nutrition: { fr: "Nutrition", en: "Nutrition" },
  food_security: { fr: "Securite alimentaire", en: "Food security" }, research: { fr: "Recherche", en: "Research" },
  other: { fr: "Autre", en: "Other" },
};
const priorityLabels: Record<ProjectPriority, { fr: string; en: string }> = {
  low: { fr: "Faible", en: "Low" }, medium: { fr: "Moyenne", en: "Medium" }, high: { fr: "Elevee", en: "High" }, critical: { fr: "Critique", en: "Critical" },
};
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

export default function ProjectIdentificationForm({ project, portfolios, programs, orgStaff = [], orgDonors = [], orgUnits = [] }: {
  project: Project; portfolios: Portfolio[]; programs: Program[]; staff?: PPMResource[]; orgStaff?: OrganizationStaff[]; orgDonors?: OrganizationDonor[]; orgUnits?: OrganizationUnit[];
}) {
  const { locale, en } = usePpmLocale();
  const pointFocalOptions = orgStaff.map(item => ({ value: item.id, label: item.full_name, hint: item.role_title || undefined }));
  const donorOptions = orgDonors.map(item => ({ value: item.id, label: item.name, hint: item.donor_type || undefined }));
  const matchedPointFocal = orgStaff.find(item => item.full_name === project.project_manager_name);
  const matchedDonor = orgDonors.find(item => item.name === project.sponsor_name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [portfolioId, setPortfolioId] = useState(project.portfolio_id);
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [endDate, setEndDate] = useState(project.end_date || "");
  const [pointFocalEmail, setPointFocalEmail] = useState(project.project_manager_email || "");
  const [donorEmail, setDonorEmail] = useState(project.sponsor_email || "");
  const availablePrograms = programs.filter(item => item.portfolio_id === portfolioId);
  const computedDuration = monthsBetween(startDate, endDate);

  function pickPointFocal(value: string) {
    const matched = orgStaff.find(item => item.id === value);
    if (matched) setPointFocalEmail(matched.email || "");
  }
  function pickDonor(value: string) {
    const matched = orgDonors.find(item => item.id === value);
    if (matched) setDonorEmail(matched.contact_email || "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const portfolio = portfolios.find(item => item.id === String(form.get("portfolio_id") || ""));
    if (!portfolio) { setSaving(false); setMessage(en ? "Invalid portfolio." : "Portefeuille invalide."); return; }
    const rawPointFocal = String(form.get("project_manager_staff_id") || "").trim();
    const matchedStaffOnSubmit = orgStaff.find(item => item.id === rawPointFocal);
    const rawDonor = String(form.get("sponsor_donor_id") || "").trim();
    const matchedDonorOnSubmit = orgDonors.find(item => item.id === rawDonor);
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
      project_manager_name: matchedStaffOnSubmit ? matchedStaffOnSubmit.full_name : (rawPointFocal || null),
      project_manager_email: String(form.get("project_manager_email") || "").trim() || null,
      sponsor_name: matchedDonorOnSubmit ? matchedDonorOnSubmit.name : (rawDonor || null),
      sponsor_email: String(form.get("sponsor_email") || "").trim() || null,
      responsible_unit: String(form.get("responsible_unit") || "") || null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      duration_months: monthsBetween(String(form.get("start_date") || ""), String(form.get("end_date") || "")),
      country: String(form.get("country") || "").trim() || null,
      regions: splitList(String(form.get("regions") || "")),
      target_population: String(form.get("target_population") || "").trim() || null,
      direct_beneficiaries: form.get("direct_beneficiaries") ? Number(form.get("direct_beneficiaries")) : null,
      indirect_beneficiaries: form.get("indirect_beneficiaries") ? Number(form.get("indirect_beneficiaries")) : null,
      grant_award_id: String(form.get("grant_award_id") || "").trim() || null,
      total_budget: form.get("total_budget") ? Number(form.get("total_budget")) : null,
      currency: String(form.get("currency") || "XAF"),
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const result = await supabase.from("ppm_projects").update(payload).eq("id", project.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(en ? "Identification saved." : "Identification enregistree.");
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Project name" : "Nom du projet"}<input name="name" defaultValue={project.name} required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Short description" : "Description courte"}<textarea name="short_description" rows={2} defaultValue={project.short_description || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Code<input name="code" defaultValue={project.code || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Acronym" : "Acronyme"}<input name="acronym" defaultValue={project.acronym || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue={project.type} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Priority" : "Priorite"}<select name="priority" defaultValue={project.priority} className="admin-input">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Portfolio" : "Portefeuille"}<select name="portfolio_id" defaultValue={project.portfolio_id} onChange={event => setPortfolioId(event.target.value)} required className="admin-input">{portfolios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Program (optional)" : "Programme (facultatif)"}<select name="program_id" defaultValue={project.program_id || ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{availablePrograms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Project focal point" : "Point Focal Projet"}<SearchableSelect name="project_manager_staff_id" options={pointFocalOptions} defaultValue={matchedPointFocal?.id || project.project_manager_name || ""} onChange={pickPointFocal} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select from the organization's staff..." : "Selectionner dans le staff de l'organisation..."} /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Focal point email" : "Email du Point Focal Projet"}<input name="project_manager_email" type="email" value={pointFocalEmail} onChange={event => setPointFocalEmail(event.target.value)} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Donors / funders" : "Bailleurs / Donateurs"}<SearchableSelect name="sponsor_donor_id" options={donorOptions} defaultValue={matchedDonor?.id || project.sponsor_name || ""} onChange={pickDonor} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select..." : "Selectionner..."} /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Donor email" : "Email bailleur"}<input name="sponsor_email" type="email" value={donorEmail} onChange={event => setDonorEmail(event.target.value)} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Grant / Award ID<input name="grant_award_id" defaultValue={project.grant_award_id || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Responsible unit" : "Unite responsable"}<select name="responsible_unit" defaultValue={project.responsible_unit || ""} className="admin-input"><option value="">—</option>{orgUnits.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Duration (months) — auto-computed" : "Duree (mois) — calculee automatiquement"}<input disabled value={computedDuration ?? "—"} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="start_date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="end_date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Country" : "Pays"}<input name="country" defaultValue={project.country || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Regions (comma-separated)" : "Regions (separees par des virgules)"}<input name="regions" defaultValue={(project.regions || []).join(", ")} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Target population" : "Population cible"}<input name="target_population" defaultValue={project.target_population || ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Direct beneficiaries" : "Beneficiaires directs"}<input name="direct_beneficiaries" type="number" min="0" defaultValue={project.direct_beneficiaries ?? ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Indirect beneficiaries" : "Beneficiaires indirects"}<input name="indirect_beneficiaries" type="number" min="0" defaultValue={project.indirect_beneficiaries ?? ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Total budget" : "Budget global"}<input name="total_budget" type="number" min="0" step="0.01" defaultValue={project.total_budget ?? ""} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue={project.currency || "XAF"} className="admin-input" /></label>
    </div>
    {message && <p className="rounded-xl bg-mint p-3 text-sm font-bold text-forest">{message}</p>}
    <div className="flex justify-end"><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save identification" : "Enregistrer l'identification")}</button></div>
  </form>;
}
