"use client";
// Refinement program, Wave 1: implementation sites get a real Country -> Region -> Division ->
// Subdivision -> Site hierarchy instead of a free-text "Localisation" field. Country -> Region
// uses the country-state-city dataset (already a dependency, used elsewhere in the app) for a
// real cascade; Division/Subdivision have no ready-made administrative dataset for every country,
// so they're free text suggested via a <datalist> built from values already entered for that
// Country/Region on this project (same "known values grow as you type" pattern as the execution
// add-on's responsible_email picker) rather than a fabricated boundary dataset.
import { useMemo, useState, type FormEvent } from "react";
import { Country, State } from "country-state-city";
import { MapPinIcon, PlusIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import PPMFormModal from "@/components/op-management/PPMFormModal";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Site } from "@/lib/ppm/types";

const countries = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name));

export default function SiteRegister({ projectId, initial }: { projectId: string; initial: Site[] }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Site | "new" | null>(null);
  const [countryIso, setCountryIso] = useState("");
  const [countryName, setCountryName] = useState("");
  const [regionName, setRegionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const states = useMemo(() => countryIso ? State.getStatesOfCountry(countryIso).sort((a, b) => a.name.localeCompare(b.name)) : [], [countryIso]);
  const divisionSuggestions = useMemo(() => Array.from(new Set(rows.filter(row => row.country === countryName && row.region === regionName && row.division).map(row => row.division as string))), [rows, countryName, regionName]);
  const subdivisionSuggestions = useMemo(() => Array.from(new Set(rows.filter(row => row.country === countryName && row.region === regionName && row.subdivision).map(row => row.subdivision as string))), [rows, countryName, regionName]);

  function openEditing(row: Site | "new") {
    setMessage("");
    setCountryName(row !== "new" ? row.country : "");
    setRegionName(row !== "new" ? row.region || "" : "");
    const isoMatch = row !== "new" ? countries.find(item => item.name === row.country)?.isoCode || "" : "";
    setCountryIso(isoMatch);
    setEditing(row);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      country: String(form.get("country") || "").trim(),
      region: String(form.get("region") || "").trim() || null,
      division: String(form.get("division") || "").trim() || null,
      subdivision: String(form.get("subdivision") || "").trim() || null,
      site_name: String(form.get("site_name") || "").trim(),
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.country || !payload.site_name) { setSaving(false); setMessage(en ? "Country and site name are required." : "Le pays et le nom du site sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_sites").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_sites").update(payload).eq("id", (editing as Site).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as Site] : current.map(row => row.id === result.data.id ? result.data as Site : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Implementation sites" : "Sites d'intervention"}</h2><button onClick={() => openEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New site" : "Nouveau site"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Site</th><th className="p-4">{en ? "Country" : "Pays"}</th><th className="p-4">{en ? "Region" : "Region"}</th><th className="p-4">Division</th><th className="p-4">{en ? "Subdivision" : "Sous-division"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.site_name}</b></td>
            <td className="p-4">{row.country}</td>
            <td className="p-4">{row.region || "—"}</td>
            <td className="p-4">{row.division || "—"}</td>
            <td className="p-4">{row.subdivision || "—"}</td>
            <td className="p-4"><button onClick={() => openEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No sites registered." : "Aucun site enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <PPMFormModal icon={MapPinIcon} title={editing === "new" ? (en ? "New site" : "Nouveau site") : (en ? "Edit site" : "Modifier le site")} onClose={() => setEditing(null)}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">{en ? "Country" : "Pays"}<select
          required className="admin-input" value={countryIso}
          onChange={event => { const iso = event.target.value; setCountryIso(iso); setCountryName(countries.find(item => item.isoCode === iso)?.name || ""); setRegionName(""); }}
        >
          <option value="">{en ? "Select..." : "Selectionner..."}</option>
          {countries.map(item => <option key={item.isoCode} value={item.isoCode}>{item.name}</option>)}
        </select></label>
        <input type="hidden" name="country" value={countryName} />
        <label className="grid gap-2 text-sm font-bold">{en ? "Region / State" : "Region / Etat"}<select
          name="region" className="admin-input" value={regionName} disabled={!states.length}
          onChange={event => setRegionName(event.target.value)}
        >
          <option value="">{states.length ? (en ? "Select..." : "Selectionner...") : (en ? "No subdivision listed" : "Aucune subdivision listee")}</option>
          {states.map(item => <option key={item.isoCode} value={item.name}>{item.name}</option>)}
        </select></label>
        <label className="grid gap-2 text-sm font-bold">Division<input name="division" list="division-suggestions" defaultValue={editing !== "new" ? editing.division || "" : ""} className="admin-input" />
          <datalist id="division-suggestions">{divisionSuggestions.map(value => <option key={value} value={value} />)}</datalist>
        </label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Subdivision" : "Sous-division"}<input name="subdivision" list="subdivision-suggestions" defaultValue={editing !== "new" ? editing.subdivision || "" : ""} className="admin-input" />
          <datalist id="subdivision-suggestions">{subdivisionSuggestions.map(value => <option key={value} value={value} />)}</datalist>
        </label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Site name" : "Nom du site"}<input name="site_name" defaultValue={editing !== "new" ? editing.site_name : ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
      </form>
    </PPMFormModal>}
  </div>;
}
