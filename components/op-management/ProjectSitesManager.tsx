"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ProjectSite, SiteAccessibility } from "@/lib/ppm/types";

const accessibilityLabels: Record<SiteAccessibility, { fr: string; en: string }> = {
  good: { fr: "Bonne", en: "Good" }, medium: { fr: "Moyenne", en: "Medium" }, poor: { fr: "Faible", en: "Poor" },
};

export default function ProjectSitesManager({ projectId, initial }: { projectId: string; initial: ProjectSite[] }) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function syncFlatSites(nextRows: ProjectSite[]) {
    await createClient().from("ppm_projects").update({ sites: nextRows.map(item => item.name) }).eq("id", projectId);
  }

  async function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) { setSaving(false); setMessage(en ? "Site name is required." : "Le nom du site est obligatoire."); return; }
    const supabase = createClient();
    const result = await supabase.from("ppm_project_sites").insert({
      project_id: projectId, name,
      accessibility: String(data.get("accessibility") || "") as SiteAccessibility || null,
      notes: String(data.get("notes") || "").trim() || null,
      sort_order: rows.length,
    }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const nextRows = [...rows, result.data as ProjectSite];
    setRows(nextRows);
    await syncFlatSites(nextRows);
    form.reset();
  }

  async function removeSite(site: ProjectSite) {
    if (!window.confirm(en ? "Remove this site?" : "Retirer ce site ?")) return;
    const result = await createClient().from("ppm_project_sites").delete().eq("id", site.id);
    if (result.error) { setMessage(result.error.message); return; }
    const nextRows = rows.filter(item => item.id !== site.id);
    setRows(nextRows);
    await syncFlatSites(nextRows);
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <h2 className="text-lg font-black text-forest">{en ? "Zones / sites" : "Zones / sites"}</h2>
    {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Site" : "Site"}</th><th className="p-3">{en ? "Accessibility" : "Accessibilite"}</th><th className="p-3">Notes</th><th className="p-3"></th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t"><td className="p-3 font-bold text-forest">{row.name}</td><td className="p-3">{row.accessibility ? accessibilityLabels[row.accessibility][locale] : "—"}</td><td className="p-3 text-slate-500">{row.notes || "—"}</td><td className="p-3"><button onClick={() => removeSite(row)} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-4 text-slate-400 hover:text-red-600" /></button></td></tr>)}
          {!rows.length && <tr><td colSpan={4} className="p-6 text-center text-slate-400">{en ? "No site added yet." : "Aucun site ajoute pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>
    <form onSubmit={addSite} className="grid grid-cols-[1fr_160px_1fr_auto] gap-2">
      <input name="name" placeholder={en ? "Site name" : "Nom du site"} className="admin-input" />
      <select name="accessibility" defaultValue="" className="admin-input"><option value="">{en ? "Accessibility" : "Accessibilite"}</option>{Object.entries(accessibilityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select>
      <input name="notes" placeholder="Notes" className="admin-input" />
      <button disabled={saving} className="btn-secondary px-3 py-2 text-xs"><PlusIcon className="mr-1 inline h-4" />{en ? "Add" : "Ajouter"}</button>
    </form>
  </div>;
}
