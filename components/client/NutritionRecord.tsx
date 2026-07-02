"use client";

import { FormEvent, useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { customIndicatorTemplates } from "@/lib/tracking-indicators";
import HealthDietaryDiversity from "@/components/client/HealthDietaryDiversity";

type Row = Record<string, any>;
type CustomMeasure = {
  name: string;
  value: string;
  unit: string;
  normalMin: string;
  normalMax: string;
};

const tabs = [
  ["anthro", "Anthropometrie"],
  ["biology", "Biologie"],
  ["food", "Alimentation"],
  ["diversity", "Diversite alimentaire"],
  ["lifestyle", "Mode de vie"],
  ["consultations", "Consultations"],
] as const;
const today = () => new Date().toLocaleDateString("en-CA");

const activityLevels = [
  { value: 1, label: "Tres faible", description: "Mode de vie sedentaire : aucune activite physique ou sportive planifiee au cours des 7 derniers jours et faible mobilite au quotidien." },
  { value: 2, label: "Faible", description: "Activite insuffisante : aucune seance planifiee, mais presence d'une activite legere dans la vie quotidienne." },
  { value: 3, label: "Moderee", description: "Une seance d'activite physique ou sportive planifiee au cours des 7 derniers jours." },
  { value: 4, label: "Bonne", description: "Deux a trois seances d'activite physique ou sportive planifiees au cours des 7 derniers jours." },
  { value: 5, label: "Excellente", description: "Plus de trois seances d'activite physique ou sportive planifiees au cours des 7 derniers jours." },
];

const dietLevels = [
  { value: 1, label: "Tres faible", description: "Tres faible consommation de fruits et legumes, alimentation peu diversifiee et consommation tres frequente d'aliments gras, sales, sucres ou ultra-transformes." },
  { value: 2, label: "Faible", description: "1 a 2 portions de fruits et legumes par jour, diversite limitee et consommation reguliere d'aliments gras, sales ou sucres." },
  { value: 3, label: "Moderee", description: "3 a 4 portions de fruits et legumes par jour, diversite acceptable et consommation occasionnelle d'aliments ultra-transformes." },
  { value: 4, label: "Bonne", description: "Au moins 5 portions de fruits et legumes, au moins 4 groupes d'aliments, bonne hydratation et consommation limitee d'aliments ultra-transformes." },
  { value: 5, label: "Excellente", description: "Alimentation tres diversifiee, bonne hydratation, horaires reguliers et consommation rare de boissons sucrees et d'aliments ultra-transformes." },
];

export default function NutritionRecord({
  clientId,
  anthropometry,
  biology,
  food,
  lifestyle,
  consultations,
  dietary,
}: {
  clientId: string;
  anthropometry: Row[];
  biology: Row[];
  food: Row[];
  lifestyle: Row[];
  consultations: Row[];
  dietary: Row[];
}) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("anthro");
  const [anthroRows, setAnthro] = useState(anthropometry);
  const [bioRows, setBio] = useState(biology);
  const [foodRows, setFood] = useState(food);
  const [lifestyleRows, setLifestyle] = useState(lifestyle);
  const [message, setMessage] = useState("");
  const anthroTemplates = useMemo(() => customIndicatorTemplates(anthroRows), [anthroRows]);
  const biologyTemplates = useMemo(() => customIndicatorTemplates(bioRows), [bioRows]);

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
      payload.content = {
        calories: payload.calories ? Number(payload.calories) : null,
        protein_g: payload.protein_g ? Number(payload.protein_g) : null,
      };
      delete payload.calories;
      delete payload.protein_g;
    }

    const { data, error } = await createClient().from(table).insert({ ...payload, client_id: clientId }).select().single();
    if (error) setMessage(error.message);
    else {
      setter([data, ...rows]);
      form.reset();
      setMessage("Nouvelle donnee ajoutee a votre historique.");
    }
  }

  async function addLifestyle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const { data, error } = await createClient()
      .from("health_lifestyle_assessments")
      .upsert({
        client_id: clientId,
        assessment_date: payload.assessment_date,
        activity_level: Number(payload.activity_level),
        diet_level: Number(payload.diet_level),
        notes: String(payload.notes || "") || null,
        recorded_by: clientId,
      }, { onConflict: "client_id,assessment_date" })
      .select()
      .single();
    if (error) setMessage(error.message);
    else {
      setLifestyle([data, ...lifestyleRows.filter(row => row.id !== data.id)]);
      form.reset();
      setMessage("Evaluation hebdomadaire enregistree.");
    }
  }

  async function remove(table: string, id: string, setter: (rows: Row[]) => void, rows: Row[]) {
    if (!window.confirm("Supprimer definitivement cette donnee ?")) return;
    const { error } = await createClient().from(table).delete().eq("id", id).eq("client_id", clientId);
    if (error) setMessage(error.message);
    else { setter(rows.filter(row => row.id !== id)); setMessage("Donnee supprimee."); }
  }

  async function edit(table: string, row: Row, columns: string[][], setter: (rows: Row[]) => void, rows: Row[], food = false) {
    const changes: Row = {};
    for (const [key, label] of columns) {
      if (["bmi", "custom_values"].includes(key)) continue;
      const current = food && key === "calories" ? row.content?.calories : row[key];
      const value = window.prompt(label, current == null ? "" : String(current));
      if (value === null) return;
      if (food && key === "calories") changes.content = { ...(row.content || {}), calories: value === "" ? null : Number(value) };
      else changes[key] = value === "" ? null : value;
    }
    const { data, error } = await createClient().from(table).update(changes).eq("id", row.id).eq("client_id", clientId).select().single();
    if (error) setMessage(error.message);
    else { setter(rows.map(item => item.id === row.id ? data : item)); setMessage("Donnee modifiee."); }
  }

  return <div>
    <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-forest text-white" : "bg-white text-forest"}`}>{label}</button>)}</div>
    {message && <p className="mb-5 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}

    {tab === "anthro" && <><RecordForm title="Ajouter des mesures anthropometriques" onSubmit={event => add("anthropometric_measurements", event, setAnthro, anthroRows)} fields={[["weight_kg", "Poids (kg)"], ["height_cm", "Taille (cm)"], ["waist_cm", "Tour de taille (cm)"], ["hip_cm", "Tour de hanche (cm)"], ["muac_cm", "PB / MUAC (cm)"], ["body_fat_percent", "Masse grasse (%)"], ["muscle_mass_kg", "Masse musculaire (kg)"]]} templates={anthroTemplates}/><History rows={anthroRows} columns={[["measured_at", "Date"], ["weight_kg", "Poids"], ["height_cm", "Taille"], ["bmi", "IMC"], ["waist_cm", "Taille abdominale"], ["muac_cm", "MUAC"], ["custom_values", "Autres mesures"]]} onEdit={(row,columns)=>edit("anthropometric_measurements",row,columns,setAnthro,anthroRows)} onDelete={id=>remove("anthropometric_measurements",id,setAnthro,anthroRows)}/></>}

    {tab === "biology" && <><RecordForm title="Ajouter des parametres biologiques" onSubmit={event => add("biological_measurements", event, setBio, bioRows)} fields={[["glucose", "Glycemie"], ["hba1c", "HbA1c"], ["total_cholesterol", "Cholesterol total"], ["hdl", "HDL"], ["ldl", "LDL"], ["triglycerides", "Triglycerides"], ["hemoglobin", "Hemoglobine"], ["ferritin", "Ferritine"], ["albumin", "Albumine"], ["crp", "CRP"], ["systolic_pressure", "Pression systolique"], ["diastolic_pressure", "Pression diastolique"]]} templates={biologyTemplates}/><History rows={bioRows} columns={[["measured_at", "Date"], ["glucose", "Glycemie"], ["hba1c", "HbA1c"], ["ldl", "LDL"], ["triglycerides", "Triglycerides"], ["systolic_pressure", "PA systolique"], ["custom_values", "Autres parametres"]]} onEdit={(row,columns)=>edit("biological_measurements",row,columns,setBio,bioRows)} onDelete={id=>remove("biological_measurements",id,setBio,bioRows)}/></>}

    {tab === "food" && <><form onSubmit={event => add("food_history", event, setFood, foodRows)} className="mb-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black md:col-span-2">Ajouter une entree alimentaire</h2><label className="grid gap-2 text-sm font-bold">Date de l'alimentation<input name="entry_date" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Type d'enregistrement<select name="entry_type" className="admin-input"><option value="24h_recall">Rappel de 24 heures</option><option value="food_frequency">Frequence alimentaire</option><option value="food_diary">Journal alimentaire</option><option value="habits">Habitudes alimentaires</option></select></label><label className="grid gap-2 text-sm font-bold">Apport energetique estime (kcal)<input name="calories" type="number" min="0" step="1" className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Proteines estimees (g)<input name="protein_g" type="number" min="0" step="0.1" className="admin-input"/></label><textarea name="notes" required rows={6} className="admin-input md:col-span-2" placeholder="Decrivez les repas, quantites, horaires et sensations..."/><button className="btn-primary justify-self-start md:col-span-2">Ajouter au journal</button></form><History rows={foodRows} columns={[["entry_date", "Date"], ["entry_type", "Type"], ["calories", "Calories"], ["notes", "Contenu"]]} food onEdit={(row,columns)=>edit("food_history",row,columns,setFood,foodRows,true)} onDelete={id=>remove("food_history",id,setFood,foodRows)}/></>}

    {tab === "lifestyle" && <LifestyleForm rows={lifestyleRows} onSubmit={addLifestyle}/>}
    {tab === "diversity" && <HealthDietaryDiversity clientId={clientId} initial={dietary}/>}

    {tab === "consultations" && <div className="grid gap-4">{consultations.map(item => <article key={item.id} className="rounded-2xl border bg-white p-6"><p className="text-xs font-bold uppercase text-leaf">{new Date(item.consultation_date).toLocaleString("fr-FR")}</p><h2 className="mt-2 text-xl font-black">{item.summary || "Consultation nutritionnelle"}</h2><div className="mt-4 grid gap-3 text-sm"><p><b>Objectifs :</b> {item.objectives || "-"}</p><p><b>Recommandations :</b> {item.recommendations || "-"}</p><p><b>Plan alimentaire :</b> {item.meal_plan || "-"}</p></div></article>)}{!consultations.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucune consultation enregistree.</p>}</div>}
  </div>;
}

function RecordForm({ title, onSubmit, fields, templates }: { title: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; fields: string[][]; templates: Array<{ name: string; unit?: string; normal_min?: number | null; normal_max?: number | null }> }) {
  const [custom, setCustom] = useState<CustomMeasure[]>(() => templates.map(item => ({
    name: item.name,
    value: "",
    unit: item.unit || "",
    normalMin: item.normal_min == null ? "" : String(item.normal_min),
    normalMax: item.normal_max == null ? "" : String(item.normal_max),
  })));
  const customValues = Object.fromEntries(custom.filter(item => item.name.trim() && item.value !== "").map(item => [item.name.trim(), {
    value: Number(item.value),
    unit: item.unit.trim(),
    normal_min: item.normalMin === "" ? null : Number(item.normalMin),
    normal_max: item.normalMax === "" ? null : Number(item.normalMax),
  }]));
  return <form onSubmit={event => { onSubmit(event); setCustom(current => current.map(item => ({ ...item, value: "" }))); }} className="mb-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
    <h2 className="text-xl font-black md:col-span-3">{title}</h2>
    <label className="grid gap-2 text-sm font-bold md:col-span-3 md:max-w-sm">Date de la mesure<input name="measured_at" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label>
    {fields.map(([name, label]) => <label key={name} className="grid gap-2 text-sm font-bold">{label}<input name={name} type="number" step="0.01" className="admin-input"/></label>)}
    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Autres mesures ou parametres</h3><p className="text-sm text-slate-500">Les indicateurs ajoutes restent disponibles pour les prochains renseignements. Ajoutez leur plage normale pour permettre la comparaison.</p></div><button type="button" className="btn-secondary px-4 py-2" onClick={() => setCustom([...custom, { name: "", value: "", unit: "", normalMin: "", normalMax: "" }])}><PlusIcon className="mr-2 h-4"/>Ajouter un parametre</button></div>
      <div className="mt-4 grid gap-3">{custom.map((item, index) => <div key={`${item.name}-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_.8fr_.7fr_.7fr_.7fr_auto]"><input aria-label="Nom du parametre" className="admin-input" placeholder="Ex. Vitamine D" value={item.name} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, name: event.target.value } : row))}/><input aria-label="Valeur du parametre" className="admin-input" type="number" step="0.01" placeholder="Valeur" value={item.value} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, value: event.target.value } : row))}/><input aria-label="Unite du parametre" className="admin-input" placeholder="Unite" value={item.unit} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, unit: event.target.value } : row))}/><input aria-label="Norme minimale" className="admin-input" type="number" step="0.01" placeholder="Norme min." value={item.normalMin} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, normalMin: event.target.value } : row))}/><input aria-label="Norme maximale" className="admin-input" type="number" step="0.01" placeholder="Norme max." value={item.normalMax} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, normalMax: event.target.value } : row))}/><button type="button" aria-label="Supprimer ce parametre" className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600" onClick={() => setCustom(custom.filter((_, i) => i !== index))}><TrashIcon className="h-5"/></button></div>)}</div>
    </div>
    <input type="hidden" name="custom_values" value={JSON.stringify(customValues)}/>
    <label className="grid gap-2 text-sm font-bold md:col-span-3">Notes<textarea name="notes" className="admin-input"/></label><button className="btn-primary justify-self-start md:col-span-3">Enregistrer</button>
  </form>;
}

function LifestyleForm({ rows, onSubmit }: { rows: Row[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="grid gap-6">
    <form onSubmit={onSubmit} className="grid gap-6 rounded-2xl border bg-white p-6">
      <div><h2 className="text-xl font-black">Appreciation globale des 7 derniers jours</h2><p className="mt-2 text-sm leading-6 text-slate-500">Une seance d'activite physique ou sportive est une activite planifiee d'au moins 30 minutes, d'intensite moderee a elevee : marche rapide, course, velo, sport collectif, gym, fitness, natation, etc.</p></div>
      <label className="grid max-w-sm gap-2 text-sm font-bold">Date de l'evaluation<input name="assessment_date" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label>
      <Scale name="activity_level" title="Sport et activite physique" levels={activityLevels}/>
      <Scale name="diet_level" title="Qualite globale de l'alimentation" levels={dietLevels}/>
      <label className="grid gap-2 text-sm font-bold">Observations facultatives<textarea name="notes" rows={3} className="admin-input"/></label>
      <button className="btn-primary justify-self-start">Enregistrer l'evaluation</button>
    </form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[650px]"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Activite physique</th><th className="p-4">Alimentation</th><th className="p-4">Notes</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b"><td className="p-4">{new Date(`${row.assessment_date}T12:00:00`).toLocaleDateString("fr-FR")}</td><td className="p-4 font-bold">{activityLevels.find(item => item.value === row.activity_level)?.label || row.activity_level}/5</td><td className="p-4 font-bold">{dietLevels.find(item => item.value === row.diet_level)?.label || row.diet_level}/5</td><td className="p-4 text-sm">{row.notes || "-"}</td></tr>)}{!rows.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucune evaluation.</td></tr>}</tbody></table></div>
  </div>;
}

function Scale({ name, title, levels }: { name: string; title: string; levels: typeof activityLevels }) {
  return <fieldset><legend className="mb-3 font-black">{title}</legend><div className="grid gap-3 sm:grid-cols-5">{levels.map(level => <label key={level.value} title={level.description} className="group relative cursor-pointer"><input type="radio" name={name} value={level.value} required className="peer sr-only"/><span className="grid min-h-20 place-items-center rounded-xl border bg-white p-3 text-center text-sm font-bold transition peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white">{level.label}<small className="mt-1 block font-normal opacity-70">{level.value}/5</small></span><span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-950 p-3 text-xs font-normal leading-5 text-white shadow-xl group-hover:block">{level.description}</span></label>)}</div></fieldset>;
}

function History({ rows, columns, food = false, onEdit, onDelete }: { rows: Row[]; columns: string[][]; food?: boolean; onEdit?: (row:Row,columns:string[][])=>void; onDelete?: (id:string)=>void }) {
  function display(row: Row, key: string) {
    if (key.includes("date") || key === "measured_at") return row[key] ? new Date(`${String(row[key]).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "-";
    if (food && key === "calories") return row.content?.calories ?? "-";
    if (key === "custom_values") {
      const entries = Object.entries(row.custom_values || {});
      return entries.length ? entries.map(([name, raw]) => {
        const item = raw as any;
        return `${name}: ${typeof item === "object" ? item.value : item}${typeof item === "object" && item.unit ? ` ${item.unit}` : ""}`;
      }).join(" | ") : "-";
    }
    return row[key] ?? "-";
  }
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px]"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400"><tr>{columns.map(([, label]) => <th key={label} className="p-4">{label}</th>)}{(onEdit||onDelete)&&<th className="p-4">Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b">{columns.map(([key]) => <td key={key} className="p-4 text-sm">{display(row, key)}</td>)}{(onEdit||onDelete)&&<td className="p-4"><div className="flex gap-2">{onEdit&&<button onClick={()=>onEdit(row,columns)} className="rounded-lg border px-3 py-2 text-xs font-bold">Modifier</button>}{onDelete&&<button onClick={()=>onDelete(row.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Supprimer</button>}</div></td>}</tr>)}{!rows.length && <tr><td colSpan={columns.length+(onEdit||onDelete?1:0)} className="p-8 text-center text-slate-400">Aucune donnee.</td></tr>}</tbody></table></div>;
}
