"use client";

import { FormEvent, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;
type CustomMeasure = { name: string; value: string; unit: string };
const tabs = [["anthro", "Anthropométrie"], ["biology", "Biologie"], ["food", "Alimentation"], ["consultations", "Consultations"]] as const;
const today = () => new Date().toLocaleDateString("en-CA");

export default function NutritionRecord({ clientId, anthropometry, biology, food, consultations }: { clientId: string; anthropometry: Row[]; biology: Row[]; food: Row[]; consultations: Row[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("anthro");
  const [anthroRows, setAnthro] = useState(anthropometry);
  const [bioRows, setBio] = useState(biology);
  const [foodRows, setFood] = useState(food);
  const [message, setMessage] = useState("");

  async function add(table: string, event: FormEvent<HTMLFormElement>, setter: (rows: Row[]) => void, rows: Row[]) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload: Record<string, any> = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(payload)) if (payload[key] === "") delete payload[key];

    if (payload.custom_values) {
      try { payload.custom_values = JSON.parse(String(payload.custom_values)); }
      catch { payload.custom_values = {}; }
    }
    if (payload.measured_at) payload.measured_at = `${payload.measured_at}T12:00:00`;
    if (table === "food_history") {
      payload.content = { calories: payload.calories ? Number(payload.calories) : null, protein_g: payload.protein_g ? Number(payload.protein_g) : null };
      delete payload.calories;
      delete payload.protein_g;
    }

    const { data, error } = await createClient().from(table).insert({ ...payload, client_id: clientId }).select().single();
    if (error) setMessage(error.message);
    else {
      setter([data, ...rows]);
      form.reset();
      setMessage("Nouvelle donnée ajoutée à votre historique.");
    }
  }

  return <div>
    <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-forest text-white" : "bg-white text-forest"}`}>{label}</button>)}</div>
    {message && <p className="mb-5 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}

    {tab === "anthro" && <><RecordForm title="Ajouter des mesures anthropométriques" onSubmit={event => add("anthropometric_measurements", event, setAnthro, anthroRows)} fields={[["weight_kg", "Poids (kg)"], ["height_cm", "Taille (cm)"], ["waist_cm", "Tour de taille (cm)"], ["hip_cm", "Tour de hanche (cm)"], ["muac_cm", "PB / MUAC (cm)"], ["body_fat_percent", "Masse grasse (%)"], ["muscle_mass_kg", "Masse musculaire (kg)"]]}/><History rows={anthroRows} columns={[["measured_at", "Date"], ["weight_kg", "Poids"], ["height_cm", "Taille"], ["bmi", "IMC"], ["waist_cm", "Taille abdominale"], ["muac_cm", "MUAC"], ["custom_values", "Autres mesures"]]}/></>}

    {tab === "biology" && <><RecordForm title="Ajouter des paramètres biologiques" onSubmit={event => add("biological_measurements", event, setBio, bioRows)} fields={[["glucose", "Glycémie"], ["hba1c", "HbA1c"], ["total_cholesterol", "Cholestérol total"], ["hdl", "HDL"], ["ldl", "LDL"], ["triglycerides", "Triglycérides"], ["hemoglobin", "Hémoglobine"], ["ferritin", "Ferritine"], ["albumin", "Albumine"], ["crp", "CRP"], ["systolic_pressure", "Pression systolique"], ["diastolic_pressure", "Pression diastolique"]]}/><History rows={bioRows} columns={[["measured_at", "Date"], ["glucose", "Glycémie"], ["hba1c", "HbA1c"], ["ldl", "LDL"], ["triglycerides", "Triglycérides"], ["systolic_pressure", "PA systolique"], ["custom_values", "Autres paramètres"]]}/></>}

    {tab === "food" && <><form onSubmit={event => add("food_history", event, setFood, foodRows)} className="mb-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black md:col-span-2">Ajouter une entrée alimentaire</h2><label className="grid gap-2 text-sm font-bold">Date de l’alimentation<input name="entry_date" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Type d’enregistrement<select name="entry_type" className="admin-input"><option value="24h_recall">Rappel de 24 heures</option><option value="food_frequency">Fréquence alimentaire</option><option value="food_diary">Journal alimentaire</option><option value="habits">Habitudes alimentaires</option></select></label><label className="grid gap-2 text-sm font-bold">Apport énergétique estimé (kcal)<input name="calories" type="number" min="0" step="1" className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Protéines estimées (g)<input name="protein_g" type="number" min="0" step="0.1" className="admin-input"/></label><textarea name="notes" required rows={6} className="admin-input md:col-span-2" placeholder="Décrivez les repas, quantités, horaires et sensations..."/><button className="btn-primary justify-self-start md:col-span-2">Ajouter au journal</button></form><History rows={foodRows} columns={[["entry_date", "Date"], ["entry_type", "Type"], ["calories", "Calories"], ["notes", "Contenu"]]} food/></>}

    {tab === "consultations" && <div className="grid gap-4">{consultations.map(item => <article key={item.id} className="rounded-2xl border bg-white p-6"><p className="text-xs font-bold uppercase text-leaf">{new Date(item.consultation_date).toLocaleString("fr-FR")}</p><h2 className="mt-2 text-xl font-black">{item.summary || "Consultation nutritionnelle"}</h2><div className="mt-4 grid gap-3 text-sm"><p><b>Objectifs :</b> {item.objectives || "-"}</p><p><b>Recommandations :</b> {item.recommendations || "-"}</p><p><b>Plan alimentaire :</b> {item.meal_plan || "-"}</p></div></article>)}{!consultations.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucune consultation enregistrée.</p>}</div>}
  </div>;
}

function RecordForm({ title, onSubmit, fields }: { title: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; fields: string[][] }) {
  const [custom, setCustom] = useState<CustomMeasure[]>([]);
  const customValues = Object.fromEntries(custom.filter(item => item.name.trim() && item.value !== "").map(item => [item.name.trim(), { value: Number(item.value), unit: item.unit.trim() }]));
  return <form onSubmit={event => { onSubmit(event); setCustom([]); }} className="mb-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
    <h2 className="text-xl font-black md:col-span-3">{title}</h2>
    <label className="grid gap-2 text-sm font-bold md:col-span-3 md:max-w-sm">Date de la mesure<input name="measured_at" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label>
    {fields.map(([name, label]) => <label key={name} className="grid gap-2 text-sm font-bold">{label}<input name={name} type="number" step="0.01" className="admin-input"/></label>)}
    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Autres mesures ou paramètres</h3><p className="text-sm text-slate-500">Ajoutez librement un indicateur qui ne figure pas dans la liste.</p></div><button type="button" className="btn-secondary px-4 py-2" onClick={() => setCustom([...custom, { name: "", value: "", unit: "" }])}><PlusIcon className="mr-2 h-4"/>Ajouter un paramètre</button></div>
      <div className="mt-4 grid gap-3">{custom.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"><input aria-label="Nom du paramètre" className="admin-input" placeholder="Ex. Vitamine D" value={item.name} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, name: event.target.value } : row))}/><input aria-label="Valeur du paramètre" className="admin-input" type="number" step="0.01" placeholder="Valeur" value={item.value} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, value: event.target.value } : row))}/><input aria-label="Unité du paramètre" className="admin-input" placeholder="Unité (mg/L...)" value={item.unit} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, unit: event.target.value } : row))}/><button type="button" aria-label="Supprimer ce paramètre" className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600" onClick={() => setCustom(custom.filter((_, i) => i !== index))}><TrashIcon className="h-5"/></button></div>)}</div>
    </div>
    <input type="hidden" name="custom_values" value={JSON.stringify(customValues)}/>
    <label className="grid gap-2 text-sm font-bold md:col-span-3">Notes<textarea name="notes" className="admin-input"/></label><button className="btn-primary justify-self-start md:col-span-3">Enregistrer</button>
  </form>;
}

function History({ rows, columns, food = false }: { rows: Row[]; columns: string[][]; food?: boolean }) {
  function display(row: Row, key: string) {
    if (key.includes("date") || key === "measured_at") return row[key] ? new Date(`${String(row[key]).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "-";
    if (food && key === "calories") return row.content?.calories ?? "-";
    if (key === "custom_values") { const entries = Object.entries(row.custom_values || {}); return entries.length ? entries.map(([name, raw]) => { const item = raw as any; return `${name}: ${typeof item === "object" ? item.value : item}${typeof item === "object" && item.unit ? ` ${item.unit}` : ""}`; }).join(" · ") : "-"; }
    return row[key] ?? "-";
  }
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px]"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400"><tr>{columns.map(([, label]) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b">{columns.map(([key]) => <td key={key} className="p-4 text-sm">{display(row, key)}</td>)}</tr>)}{!rows.length && <tr><td colSpan={columns.length} className="p-8 text-center text-slate-400">Aucune donnée.</td></tr>}</tbody></table></div>;
}
