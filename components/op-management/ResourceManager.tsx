"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, OrganizationStaff, PPMResource, PPMStatus, ResourceAssignment, ResourceType } from "@/lib/ppm/types";

const typeLabels: Record<ResourceType, { fr: string; en: string }> = {
  human: { fr: "Personnel", en: "Staff" }, consultant: { fr: "Consultant", en: "Consultant" }, equipment: { fr: "Equipement", en: "Equipment" },
  vehicle: { fr: "Vehicule", en: "Vehicle" }, infrastructure: { fr: "Infrastructure", en: "Infrastructure" },
  service: { fr: "Service", en: "Service" }, consumable: { fr: "Consommable", en: "Consumable" }, material: { fr: "Materiel", en: "Material" }, other: { fr: "Autre", en: "Other" },
};
// Refinement program, Wave 9 (item 50): per-module workflow permissions, checked at staff
// creation — module -> can submit/verify/approve. Kept as a small representative set covering
// the workflows this program built, not an exhaustive list of every register in the app.
const PPM_MODULES: Array<[string, string, string]> = [
  ["budget", "Budget", "Budget"], ["expenses", "Depenses", "Expenses"], ["procurement", "Procurement", "Procurement"],
  ["achievements", "Realisations", "Achievements"], ["quality", "Qualite", "Quality"], ["risks", "Risques", "Risks"],
  ["deliverables", "Livrables", "Deliverables"], ["external_approvals", "Approbations externes", "External approvals"],
];
type ResourcePermissions = Record<string, { submit?: boolean; verify?: boolean; approve?: boolean }>;

export default function ResourceManager({ projectId, initial, initialAssignments, activities, title, allowedTypes, orgStaff = [] }: {
  projectId: string; initial: PPMResource[]; initialAssignments: ResourceAssignment[]; activities: Activity[];
  title?: string; allowedTypes?: ResourceType[]; orgStaff?: OrganizationStaff[];
}) {
  const { locale, en } = usePpmLocale();
  const resolvedTitle = title || (en ? "Resources" : "Ressources");
  const [rows, setRows] = useState(initial);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editing, setEditing] = useState<PPMResource | "new" | null>(null);
  const [assigning, setAssigning] = useState<PPMResource | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";
  const typeOptions = allowedTypes || (Object.keys(typeLabels) as ResourceType[]);
  const defaultType = typeOptions[0] || "human";
  const [formType, setFormType] = useState<ResourceType>(defaultType);
  const isHumanType = formType === "human" || formType === "consultant";
  const [permissions, setPermissions] = useState<ResourcePermissions>({});
  const [conditionStatus, setConditionStatus] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [roleValue, setRoleValue] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const orgStaffOptions = orgStaff.map(item => ({ value: item.id, label: item.full_name, hint: item.role_title || undefined }));
  const [creatingAccountFor, setCreatingAccountFor] = useState<PPMResource | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  function openEditing(row: PPMResource | "new") {
    setMessage("");
    setFormType(row === "new" ? defaultType : row.type);
    setPermissions(row !== "new" ? row.permissions || {} : {});
    const condition = row !== "new" ? row.condition_notes || "" : "";
    setConditionStatus(["good", "revision_required", "maintenance_planned"].includes(condition) ? condition : condition ? "other" : "");
    setNameValue(row !== "new" ? row.name : "");
    setRoleValue(row !== "new" ? row.role_title || "" : "");
    setSkills(row !== "new" ? row.skills || [] : []);
    setSkillDraft("");
    setEditing(row);
  }

  function togglePermission(module: string, step: "submit" | "verify" | "approve") {
    setPermissions(current => ({ ...current, [module]: { ...current[module], [step]: !current[module]?.[step] } }));
  }

  async function submitAccountCreation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creatingAccountFor) return;
    setAccountSaving(true);
    setAccountMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const response = await fetch("/api/ppm/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_id: creatingAccountFor.id, email }),
    });
    const payload = await response.json();
    setAccountSaving(false);
    if (!response.ok) { setAccountMessage(payload.message || (en ? "Account creation failed." : "Creation du compte impossible.")); return; }
    setRows(current => current.map(row => row.id === creatingAccountFor.id ? payload.resource as PPMResource : row));
    setCreatingAccountFor(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      type: String(form.get("type") || defaultType) as ResourceType,
      name: String(form.get("name") || "").trim(),
      type_other_detail: formType === "other" ? String(form.get("type_other_detail") || "").trim() || null : null,
      role_title: String(form.get("role_title") || "").trim() || null,
      skills,
      availability_percent: form.get("availability_percent") ? Number(form.get("availability_percent")) : null,
      weekly_capacity_hours: form.get("weekly_capacity_hours") ? Number(form.get("weekly_capacity_hours")) : null,
      condition_notes: String(form.get("condition_status") || "") === "other" ? String(form.get("condition_other") || "").trim() || "other" : String(form.get("condition_status") || "").trim() || null,
      cost_rate: form.get("cost_rate") ? Number(form.get("cost_rate")) : null,
      cost_unit: String(form.get("cost_unit") || "day"),
      currency: String(form.get("currency") || "XAF"),
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
      permissions: isHumanType ? permissions : {},
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_resources").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_resources").update(payload).eq("id", (editing as PPMResource).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as PPMResource] : current.map(row => row.id === result.data.id ? result.data as PPMResource : row));
    setEditing(null);
  }

  // Refinement program, Wave 5 (item 23): a resource can be assigned to multiple Work Packages/
  // Activities at once — one submission inserts one ppm_resource_assignments row per selected
  // activity instead of forcing one modal round-trip per activity (already many-to-many at the
  // DB level, this was a UI-only limitation).
  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigning) return;
    const form = new FormData(event.currentTarget);
    const activityIds = form.getAll("activity_ids").map(String).filter(Boolean);
    if (!activityIds.length) return;
    const allocationPercent = form.get("allocation_percent") ? Number(form.get("allocation_percent")) : null;
    const startDate = String(form.get("start_date") || "") || null;
    const endDate = String(form.get("end_date") || "") || null;
    const supabase = createClient();
    const result = await supabase.from("ppm_resource_assignments").insert(
      activityIds.map(activityId => ({
        project_id: projectId, resource_id: assigning.id, activity_id: activityId,
        allocation_percent: allocationPercent, start_date: startDate, end_date: endDate,
      })),
    ).select("*");
    if (!result.error) setAssignments(current => [...current, ...(result.data as ResourceAssignment[])]);
    setAssigning(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{resolvedTitle}</h2><button onClick={() => openEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New resource" : "Nouvelle ressource"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Resource" : "Ressource"}</th><th className="p-4">Type</th><th className="p-4">{en ? "Availability" : "Disponibilite"}</th><th className="p-4">{en ? "Cost" : "Cout"}</th><th className="p-4">{en ? "Assignments" : "Affectations"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.role_title && <p className="mt-1 text-xs text-slate-400">{row.role_title}</p>}</td>
            <td className="p-4">{typeLabels[row.type][locale]}</td>
            <td className="p-4">{row.availability_percent != null ? `${row.availability_percent}%` : "—"}</td>
            <td className="p-4">{row.cost_rate ? `${row.cost_rate.toLocaleString("fr-FR")} ${row.currency || ""}/${row.cost_unit}` : "—"}</td>
            <td className="p-4">{assignments.filter(a => a.resource_id === row.id).map(a => activityLabel(a.activity_id)).join(", ") || "—"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <button onClick={() => openEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button>
              <button onClick={() => setAssigning(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Assign" : "Affecter"}</button>
              {(row.type === "human" || row.type === "consultant") && (row.user_id
                ? <span className="rounded-full bg-mint px-3 py-2 text-xs font-bold text-forest">{en ? "Active account" : "Compte actif"} ({row.account_email})</span>
                : <button onClick={() => { setAccountMessage(""); setCreatingAccountFor(row); }} className="btn-primary px-3 py-2 text-xs">{en ? "Create access account" : "Creer un compte d'acces"}</button>)}
            </div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No resources registered." : "Aucune ressource enregistree."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New resource" : "Nouvelle ressource") : (en ? "Edit resource" : "Modifier la ressource")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {isHumanType && !!orgStaffOptions.length && <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Fill in from the organization directory (optional)" : "Renseigner depuis l'annuaire de l'organisation (facultatif)"}<SearchableSelect name="org_staff_pick" options={orgStaffOptions} placeholder={en ? "Select..." : "Selectionner..."} onChange={value => { const picked = orgStaff.find(item => item.id === value); if (picked) { setNameValue(picked.full_name); setRoleValue(picked.role_title || ""); } }} /></label>}
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Name" : "Nom"}<input name="name" value={nameValue} onChange={event => setNameValue(event.target.value)} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select value={formType} onChange={event => setFormType(event.target.value as ResourceType)} className="admin-input">{typeOptions.map(value => <option key={value} value={value}>{typeLabels[value][locale]}</option>)}</select><input type="hidden" name="type" value={formType} /></label>{formType === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify resource type" : "Preciser le type de ressource"}<input name="type_other_detail" defaultValue={editing !== "new" ? editing.type_other_detail || "" : ""} required className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold">{isHumanType ? (en ? "Job title / Function" : "Titre du poste/Fonction") : (en ? "Role or use" : "Role ou utilisation")}<input name="role_title" value={roleValue} onChange={event => setRoleValue(event.target.value)} className="admin-input" /></label>
          {isHumanType ? <>
            <div className="grid gap-2 text-sm font-bold sm:col-span-2"><span>{en ? "Skills" : "Competences"}</span><div className="flex gap-2"><input value={skillDraft} onChange={event => setSkillDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); const value=skillDraft.trim(); if(value&&!skills.some(item=>item.toLowerCase()===value.toLowerCase())) setSkills(current=>[...current,value]); setSkillDraft(""); } }} placeholder={en ? "Enter a skill" : "Saisir une competence"} className="admin-input"/><button type="button" onClick={()=>{const value=skillDraft.trim();if(value&&!skills.some(item=>item.toLowerCase()===value.toLowerCase()))setSkills(current=>[...current,value]);setSkillDraft("")}} className="btn-secondary whitespace-nowrap px-4">+ {en ? "Add a skill" : "Ajouter une competence"}</button></div>{!!skills.length&&<div className="flex flex-wrap gap-2">{skills.map(skill=><span key={skill} className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs text-forest">{skill}<button type="button" onClick={()=>setSkills(current=>current.filter(item=>item!==skill))}><XMarkIcon className="h-3.5 w-3.5"/></button></span>)}</div>}</div>
            <label className="grid gap-2 text-sm font-bold">{en ? "Availability (%)" : "Disponibilite (%)"}<input name="availability_percent" type="number" min="0" max="100" defaultValue={editing !== "new" ? editing.availability_percent ?? "" : ""} className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Weekly capacity (hours)" : "Capacite hebdo (heures)"}<input name="weekly_capacity_hours" type="number" min="0" defaultValue={editing !== "new" ? editing.weekly_capacity_hours ?? "" : ""} className="admin-input" /></label>
          </> : <div className="grid gap-3 sm:col-span-2"><label className="grid gap-2 text-sm font-bold">{en ? "Condition / maintenance notes" : "Etat / notes de maintenance"}<select name="condition_status" value={conditionStatus} onChange={event => setConditionStatus(event.target.value)} className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option><option value="good">{en ? "Good condition" : "Bon etat"}</option><option value="revision_required">{en ? "Revision required" : "Revision necessaire"}</option><option value="maintenance_planned">{en ? "Maintenance planned" : "Maintenance prevue"}</option><option value="other">{en ? "Other (specify)" : "Autre a preciser"}</option></select></label>{conditionStatus === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify" : "A preciser"}<textarea name="condition_other" rows={2} defaultValue={editing !== "new" && !["good", "revision_required", "maintenance_planned"].includes(editing.condition_notes || "") ? editing.condition_notes || "" : ""} className="admin-input" /></label>}</div>}
          {isHumanType && <div className="sm:col-span-2">
            <p className="text-sm font-black uppercase text-slate-400">{en ? "Per-module permissions" : "Permissions par module"}</p>
            <div className="mt-2 overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Module</th><th className="p-2 text-center">{en ? "Submit" : "Soumettre"}</th><th className="p-2 text-center">{en ? "Verify" : "Verifier"}</th><th className="p-2 text-center">{en ? "Approve" : "Approuver"}</th></tr></thead>
                <tbody>
                  {PPM_MODULES.map(([key, label, labelEn]) => <tr key={key} className="border-t">
                    <td className="p-2 font-bold text-forest">{en ? labelEn : label}</td>
                    {(["submit", "verify", "approve"] as const).map(step => <td key={step} className="p-2 text-center"><input type="checkbox" checked={!!permissions[key]?.[step]} onChange={() => togglePermission(key, step)} className="h-4 w-4" /></td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Cost" : "Cout"}<input name="cost_rate" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.cost_rate ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Cost unit" : "Unite de cout"}<select name="cost_unit" defaultValue={editing !== "new" ? editing.cost_unit || "day" : "day"} className="admin-input"><option value="hour">{en ? "Hour" : "Heure"}</option><option value="day">{en ? "Day" : "Jour"}</option><option value="week">{en ? "Week" : "Semaine"}</option><option value="month">{en ? "Month" : "Mois"}</option><option value="flat">{en ? "Flat fee" : "Forfait"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">{en ? "Draft" : "Brouillon"}</option><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "On hold" : "En pause"}</option><option value="closed">{en ? "Closed" : "Cloture"}</option><option value="cancelled">{en ? "Cancelled" : "Annule"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {assigning && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitAssignment} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Assign" : "Affecter"} {assigning.name}</h2><button type="button" onClick={() => setAssigning(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-2 text-sm font-bold">
            {en ? "Activities (multi-select)" : "Activites (selection multiple)"}
            <div className="max-h-48 overflow-y-auto rounded-xl border p-2">
              {activities.map(item => <label key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-normal hover:bg-mint/40"><input type="checkbox" name="activity_ids" value={item.id} className="h-4 w-4" />{item.title}</label>)}
              {!activities.length && <p className="p-2 text-sm text-slate-400">{en ? "No activity available." : "Aucune activite disponible."}</p>}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Allocation rate (%)" : "Taux d'allocation (%)"}<input name="allocation_percent" type="number" min="0" max="100" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="start_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="end_date" type="date" className="admin-input" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAssigning(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Assign" : "Affecter"}</button></div>
        </div>
      </form>
    </div>}

    {creatingAccountFor && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitAccountCreation} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Create access account" : "Creer un compte d'acces"} — {creatingAccountFor.name}</h2><button type="button" onClick={() => setCreatingAccountFor(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <p className="mt-2 text-sm text-slate-500">{en ? "A temporary password will be generated and sent by email. The person will have to change it on first login." : "Un mot de passe temporaire sera genere et envoye par email. La personne devra le changer a sa premiere connexion."}</p>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input" /></label>
          {accountMessage && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{accountMessage}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreatingAccountFor(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={accountSaving} className="btn-primary">{accountSaving ? (en ? "Creating..." : "Creation...") : (en ? "Create the account" : "Creer le compte")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
