"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOrganization, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { Operation, OperationActivityType, OperationProductType, Organization, Project } from "@/lib/ppm/types";

const productTypeLabels: Record<OperationProductType, { fr: string; en: string }> = {
  cash: { fr: "Cash", en: "Cash" }, food: { fr: "Vivres (Food)", en: "Food" }, nfi: { fr: "NFI", en: "NFI" }, other: { fr: "Autre", en: "Other" },
};
const activityTypeLabels: Record<OperationActivityType, { fr: string; en: string }> = {
  gfd: { fr: "Distribution generale de vivres (GFD)", en: "General Food Distribution (GFD)" },
  ans: { fr: "Distribution des aliments nutritifs specialises (ANS)", en: "Specialized Nutritious Foods (ANS)" },
  school_meal: { fr: "Repas scolaire", en: "School Meal" },
  other: { fr: "Autre", en: "Other" },
};
// Spec defaults — kept in French labels here since ppm_ops_age_groups.label has no fr/en split
// (it's an editable, per-operation free-text list, not a bilingual enum).
const DEFAULT_AGE_GROUPS = ["6-23 mois", "24-59 mois", "3-5 ans", "6-11 ans", "12-18 ans", "18 ans et plus"];

export default function OperationManager({ initial, organizations, projects }: {
  initial: Operation[]; organizations: Organization[]; projects: Project[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || "");
  const [productType, setProductType] = useState<OperationProductType>("food");
  const [activityType, setActivityType] = useState<OperationActivityType>("gfd");
  const availableProjects = projects.filter(item => !organizationId || item.organization_id === organizationId);
  const organizationName = (id: string) => organizations.find(item => item.id === id)?.name || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (!organizationId) { setSaving(false); setMessage(en ? "Select an organization." : "Selectionnez une organisation."); return; }
    const payload = {
      organization_id: organizationId,
      project_id: String(form.get("project_id") || "") || null,
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      period_start: String(form.get("period_start") || ""),
      period_end: String(form.get("period_end") || ""),
      product_type: productType,
      product_type_other: productType === "other" ? String(form.get("product_type_other") || "").trim() || null : null,
      activity_type: activityType,
      activity_type_other: activityType === "other" ? String(form.get("activity_type_other") || "").trim() || null : null,
      is_sf_hgsf: form.get("is_sf_hgsf") === "on",
      currency: String(form.get("currency") || "XOF").trim() || "XOF",
      status: "draft" as const,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    if (!payload.period_start || !payload.period_end) { setSaving(false); setMessage(en ? "Start and end dates are required." : "Les dates de debut et de fin sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgCode = await getOrgCodeForOrganization(supabase, organizationId);
    const result = await withUniqueRegistryCode<Operation>(
      async code => await supabase.from("ppm_ops_operations").insert({ ...payload, code, created_by: user?.id }).select("*").single(),
      () => generateRegistryCode(orgCode, "distribution_operation"),
    );
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as Operation;
    await supabase.from("ppm_history").insert({ entity_type: "distribution_operation", entity_id: created.id, actor_id: user?.id, action: "Operation creee", to_status: payload.status, note: payload.name });
    // Seed the six spec-default beneficiary age groups — editable afterwards from Planification.
    await supabase.from("ppm_ops_age_groups").insert(DEFAULT_AGE_GROUPS.map((label, index) => ({ operation_id: created.id, label, sort_order: index })));
    setRows(current => [created, ...current]);
    setCreating(false);
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">{en ? "Operations" : "Operations"}</h1><p className="mt-1 text-sm text-slate-500">{rows.length} {en ? "operation(s) registered" : "operation(s) enregistree(s)"}</p></div>
      <button onClick={() => setCreating(true)} disabled={!organizations.length} className="btn-primary disabled:opacity-40"><PlusIcon className="mr-2 h-5" />{en ? "New operation" : "Nouvelle operation"}</button>
    </div>
    {!organizations.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "Create an organization first before adding an operation." : "Creez d'abord une organisation avant d'ajouter une operation."}</p>}

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Name" : "Nom"}</th><th className="p-4">{en ? "Organization" : "Organisation"}</th><th className="p-4">{en ? "Activity" : "Activite"}</th><th className="p-4">{en ? "Period" : "Periode"}</th><th className="p-4">SF/HGSF</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b><span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span></td>
            <td className="p-4">{organizationName(row.organization_id)}</td>
            <td className="p-4">{row.activity_type === "other" ? (row.activity_type_other || activityTypeLabels.other[locale]) : activityTypeLabels[row.activity_type][locale]}</td>
            <td className="p-4">{new Date(row.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(row.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}</td>
            <td className="p-4">{row.is_sf_hgsf ? (en ? "Yes" : "Oui") : (en ? "No" : "Non")}</td>
            <td className="p-4"><EntityStatusBadge status={row.status === "suspended" ? "on_hold" : row.status} /></td>
            <td className="p-4"><Link href={`/op-management/operations/${row.id}`} className="btn-secondary px-3 py-2 text-xs">{en ? "Open record" : "Ouvrir la fiche"}</Link></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No operations yet." : "Aucune operation pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "New operation" : "Nouvelle operation"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Operation name" : "Nom de l'operation"}<input name="name" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Organization" : "Organisation"}<select value={organizationId} onChange={event => setOrganizationId(event.target.value)} required className="admin-input"><option value="">{en ? "Select" : "Selectionner"}</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Project (if applicable)" : "Projet (si applicable)"}<select name="project_id" className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{availableProjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Description" : "Description"}<textarea name="description" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="period_start" type="date" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="period_end" type="date" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Product to distribute" : "Produit a distribuer"}<select value={productType} onChange={event => setProductType(event.target.value as OperationProductType)} className="admin-input">{Object.entries(productTypeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {productType === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify the product" : "Preciser le produit"}<input name="product_type_other" className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Activity" : "Activite"}<select value={activityType} onChange={event => setActivityType(event.target.value as OperationActivityType)} className="admin-input">{Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {activityType === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify the activity" : "Preciser l'activite"}<input name="activity_type_other" className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue="XOF" className="admin-input" /></label>
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" name="is_sf_hgsf" className="h-4 w-4" />{en ? "School Feeding / Home-Grown School Feeding (SF/HGSF) operation" : "Operation d'alimentation scolaire (SF/HGSF)"}</label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create operation" : "Creer l'operation")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
