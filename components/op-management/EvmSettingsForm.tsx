"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { EvMethod, EvmReportingFrequency, EvmSettings, PPMResource } from "@/lib/ppm/types";

const evMethodLabels: Record<EvMethod, { fr: string; en: string }> = {
  "0_100": { fr: "0/100", en: "0/100" }, "50_50": { fr: "50/50", en: "50/50" }, "20_80": { fr: "20/80", en: "20/80" },
  percent_complete: { fr: "Pourcentage physique valide", en: "Validated physical percentage" }, units_complete: { fr: "Unites completees", en: "Units completed" },
  milestone_weighted: { fr: "Jalons ponderes (Milestone Weighted)", en: "Milestone Weighted" },
};
const frequencyLabels: Record<EvmReportingFrequency, { fr: string; en: string }> = { weekly: { fr: "Hebdomadaire", en: "Weekly" }, monthly: { fr: "Mensuelle", en: "Monthly" }, quarterly: { fr: "Trimestrielle", en: "Quarterly" } };

export default function EvmSettingsForm({ projectId, initial, onSaved, staff = [] }: { projectId: string; initial: EvmSettings | null; onSaved: (row: EvmSettings) => void; staff?: PPMResource[] }) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      enabled: form.get("enabled") === "on",
      ev_method_default: String(form.get("ev_method_default") || "percent_complete") as EvMethod,
      control_level: String(form.get("control_level") || "work_package") as "work_package" | "activity",
      status_date: String(form.get("status_date") || new Date().toISOString().slice(0, 10)),
      reporting_frequency: String(form.get("reporting_frequency") || "") as EvmReportingFrequency || null,
      spi_threshold_green: Number(form.get("spi_threshold_green") || 0.95),
      spi_threshold_orange: Number(form.get("spi_threshold_orange") || 0.85),
      cpi_threshold_green: Number(form.get("cpi_threshold_green") || 0.95),
      cpi_threshold_orange: Number(form.get("cpi_threshold_orange") || 0.85),
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_evm_settings").upsert({ ...payload, created_by: user?.id }, { onConflict: "project_id" }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as EvmSettings;
    setSettings(saved);
    onSaved(saved);
    setMessage(en ? "Settings saved." : "Parametres enregistres.");
  }

  return <form onSubmit={submit} className="rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-black text-forest">{en ? "EVM settings" : "Parametres EVM"}</h2>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="enabled" defaultChecked={settings?.enabled ?? false} className="h-4 w-4" />{en ? "Earned Value Management enabled" : "Earned Value Management active"}</label>
    </div>
    <p className="mt-1 text-xs text-slate-400">{en ? "EVM is optional: this project can stay on simple tracking if the box is not checked." : "L'EVM est optionnel : ce projet peut rester en suivi simple si la case n'est pas cochee."}</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">{en ? "Control level" : "Niveau de controle"}<select name="control_level" defaultValue={settings?.control_level || "work_package"} className="admin-input"><option value="work_package">Work Package</option><option value="activity">{en ? "Activity" : "Activite"}</option></select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Default EV method" : "Methode EV par defaut"}<select name="ev_method_default" defaultValue={settings?.ev_method_default || "percent_complete"} className="admin-input">{Object.entries(evMethodLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Status Date (reference date)" : "Status Date (date de reference)"}<input name="status_date" type="date" defaultValue={settings?.status_date || new Date().toISOString().slice(0, 10)} required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Reporting frequency" : "Frequence de reporting"}<select name="reporting_frequency" defaultValue={settings?.reporting_frequency || ""} className="admin-input"><option value="">—</option>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "SPI green threshold (≥)" : "Seuil SPI vert (≥)"}<input name="spi_threshold_green" type="number" step="0.01" defaultValue={settings?.spi_threshold_green ?? 0.95} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "SPI orange threshold (≥)" : "Seuil SPI orange (≥)"}<input name="spi_threshold_orange" type="number" step="0.01" defaultValue={settings?.spi_threshold_orange ?? 0.85} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "CPI green threshold (≥)" : "Seuil CPI vert (≥)"}<input name="cpi_threshold_green" type="number" step="0.01" defaultValue={settings?.cpi_threshold_green ?? 0.95} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "CPI orange threshold (≥)" : "Seuil CPI orange (≥)"}<input name="cpi_threshold_orange" type="number" step="0.01" defaultValue={settings?.cpi_threshold_orange ?? 0.85} className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "EVM responsible" : "Responsable EVM"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={settings?.responsible_name || ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
    </div>
  </form>;
}
