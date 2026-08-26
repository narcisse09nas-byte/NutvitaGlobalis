"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMStatus, Stakeholder, StakeholderCategory, StakeholderLevel, StakeholderPosition } from "@/lib/ppm/types";

const categoryLabels: Record<StakeholderCategory, { fr: string; en: string }> = {
  internal: { fr: "Interne", en: "Internal" }, external: { fr: "Externe", en: "External" }, donor: { fr: "Bailleur", en: "Donor" },
  beneficiary: { fr: "Beneficiaire", en: "Beneficiary" }, government: { fr: "Gouvernement", en: "Government" },
  partner: { fr: "Partenaire", en: "Partner" }, community: { fr: "Communaute", en: "Community" }, other: { fr: "Autre", en: "Other" },
};
const levelLabels: Record<StakeholderLevel, { fr: string; en: string }> = { low: { fr: "Faible", en: "Low" }, medium: { fr: "Moyen", en: "Medium" }, high: { fr: "Eleve", en: "High" } };
const positionLabels: Record<StakeholderPosition, { fr: string; en: string }> = {
  champion: { fr: "Champion", en: "Champion" }, supporter: { fr: "Soutien", en: "Supporter" }, neutral: { fr: "Neutre", en: "Neutral" },
  critic: { fr: "Critique", en: "Critic" }, blocker: { fr: "Bloquant", en: "Blocker" },
};
const positionTones: Record<StakeholderPosition, string> = {
  champion: "bg-mint text-forest", supporter: "bg-sky-50 text-sky-800", neutral: "bg-slate-100 text-slate-600",
  critic: "bg-amber-50 text-amber-800", blocker: "bg-red-50 text-red-700",
};

export default function StakeholderRegister({ projectId, initial }: { projectId: string; initial: Stakeholder[] }) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Stakeholder | "new" | null>(null);
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
      organization: String(form.get("organization") || "").trim() || null,
      role_title: String(form.get("role_title") || "").trim() || null,
      category: String(form.get("category") || "internal") as StakeholderCategory,
      influence_level: String(form.get("influence_level") || "medium") as StakeholderLevel,
      interest_level: String(form.get("interest_level") || "medium") as StakeholderLevel,
      position: String(form.get("position") || "neutral") as StakeholderPosition,
      contact_email: String(form.get("contact_email") || "").trim() || null,
      contact_phone: String(form.get("contact_phone") || "").trim() || null,
      engagement_strategy: String(form.get("engagement_strategy") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_stakeholders").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_stakeholders").update(payload).eq("id", (editing as Stakeholder).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as Stakeholder] : current.map(row => row.id === result.data.id ? result.data as Stakeholder : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Stakeholders" : "Parties prenantes"}</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New stakeholder" : "Nouvelle partie prenante"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Stakeholder" : "Partie prenante"}</th><th className="p-4">{en ? "Category" : "Categorie"}</th><th className="p-4">{en ? "Influence" : "Influence"}</th><th className="p-4">{en ? "Interest" : "Interet"}</th><th className="p-4">Position</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.organization && <p className="mt-1 text-xs text-slate-400">{row.organization}{row.role_title ? ` · ${row.role_title}` : ""}</p>}</td>
            <td className="p-4">{categoryLabels[row.category][locale]}</td>
            <td className="p-4">{levelLabels[row.influence_level][locale]}</td>
            <td className="p-4">{levelLabels[row.interest_level][locale]}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${positionTones[row.position]}`}>{positionLabels[row.position][locale]}</span></td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No stakeholders registered." : "Aucune partie prenante enregistree."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New stakeholder" : "Nouvelle partie prenante") : (en ? "Edit stakeholder" : "Modifier la partie prenante")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Organization" : "Organisation"}<input name="organization" defaultValue={editing !== "new" ? editing.organization || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Role" : "Fonction"}<input name="role_title" defaultValue={editing !== "new" ? editing.role_title || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue={editing !== "new" ? editing.category : "internal"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Position<select name="position" defaultValue={editing !== "new" ? editing.position : "neutral"} className="admin-input">{Object.entries(positionLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Influence level" : "Niveau d'influence"}<select name="influence_level" defaultValue={editing !== "new" ? editing.influence_level : "medium"} className="admin-input">{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Interest level" : "Niveau d'interet"}<select name="interest_level" defaultValue={editing !== "new" ? editing.interest_level : "medium"} className="admin-input">{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Email<input name="contact_email" type="email" defaultValue={editing !== "new" ? editing.contact_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Phone" : "Telephone"}<input name="contact_phone" defaultValue={editing !== "new" ? editing.contact_phone || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Engagement strategy" : "Strategie d'engagement"}<textarea name="engagement_strategy" rows={2} defaultValue={editing !== "new" ? editing.engagement_strategy || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">{en ? "Draft" : "Brouillon"}</option><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "On hold" : "En pause"}</option><option value="closed">{en ? "Closed" : "Cloture"}</option><option value="cancelled">{en ? "Cancelled" : "Annule"}</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
