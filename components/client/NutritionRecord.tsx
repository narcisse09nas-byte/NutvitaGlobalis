"use client";

import { FormEvent, useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { customIndicatorTemplates } from "@/lib/tracking-indicators";
import HealthDietaryDiversity from "@/components/client/HealthDietaryDiversity";
import { defaultLabParameters } from "@/components/health/LabParameterEditor";
import WellnessQuestionnaires from "@/components/health/WellnessQuestionnairesV2";
import LifestyleAssessmentRegistry from "@/components/client/LifestyleAssessmentRegistry";
import { buildAssessmentSnapshot, scoreToLegacyLevel } from "@/lib/wellness-assessments-v2";

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
  ["vitals", "Tension arterielle"],
  ["biology", "Biologie"],
  ["food", "Alimentation"],
  ["lifestyle", "Mode de vie"],
  ["consultations", "Consultations"],
] as const;
const today = () => new Date().toLocaleDateString("en-CA");

const activityLevels = [
  { value: 1, label: "Tres faible", labelEn:"Very low", description: "Mode de vie sedentaire : aucune activite physique ou sportive planifiee au cours des 7 derniers jours et faible mobilite au quotidien.",descriptionEn:"Sedentary lifestyle: no planned physical or sports activity during the past 7 days and low daily mobility." },
  { value: 2, label: "Faible", labelEn:"Low", description: "Activite insuffisante : aucune seance planifiee, mais presence d'une activite legere dans la vie quotidienne.",descriptionEn:"Insufficient activity: no planned session, with some light activity in daily life." },
  { value: 3, label: "Moderee", labelEn:"Moderate", description: "Une seance d'activite physique ou sportive planifiee au cours des 7 derniers jours.",descriptionEn:"One planned physical activity or sports session during the past 7 days." },
  { value: 4, label: "Bonne", labelEn:"Good", description: "Deux a trois seances d'activite physique ou sportive planifiees au cours des 7 derniers jours.",descriptionEn:"Two to three planned physical activity or sports sessions during the past 7 days." },
  { value: 5, label: "Excellente", labelEn:"Excellent", description: "Plus de trois seances d'activite physique ou sportive planifiees au cours des 7 derniers jours.",descriptionEn:"More than three planned physical activity or sports sessions during the past 7 days." },
];

const dietLevels = [
  { value: 1, label: "Tres faible",labelEn:"Very low", description: "Tres faible consommation de fruits et legumes, alimentation peu diversifiee et consommation tres frequente d'aliments gras, sales, sucres ou ultra-transformes.",descriptionEn:"Very low fruit and vegetable intake, little diversity and very frequent fatty, salty, sugary or ultra-processed foods." },
  { value: 2, label: "Faible",labelEn:"Low", description: "1 a 2 portions de fruits et legumes par jour, diversite limitee et consommation reguliere d'aliments gras, sales ou sucres.",descriptionEn:"1 to 2 portions of fruit and vegetables daily, limited diversity and regular fatty, salty or sugary foods." },
  { value: 3, label: "Moderee",labelEn:"Moderate", description: "3 a 4 portions de fruits et legumes par jour, diversite acceptable et consommation occasionnelle d'aliments ultra-transformes.",descriptionEn:"3 to 4 portions of fruit and vegetables daily, acceptable diversity and occasional ultra-processed foods." },
  { value: 4, label: "Bonne",labelEn:"Good", description: "Au moins 5 portions de fruits et legumes, au moins 4 groupes d'aliments, bonne hydratation et consommation limitee d'aliments ultra-transformes.",descriptionEn:"At least 5 portions of fruit and vegetables, at least 4 food groups, good hydration and limited ultra-processed foods." },
  { value: 5, label: "Excellente",labelEn:"Excellent", description: "Alimentation tres diversifiee, bonne hydratation, horaires reguliers et consommation rare de boissons sucrees et d'aliments ultra-transformes.",descriptionEn:"Highly diverse diet, good hydration, regular meal times and rare sugary drinks or ultra-processed foods." },
];

export default function NutritionRecord({
  clientId,
  anthropometry,
  biology,
  food,
  lifestyle,
  consultations,
  dietary,
  locale = "fr",
}: {
  clientId: string;
  anthropometry: Row[];
  biology: Row[];
  food: Row[];
  lifestyle: Row[];
  consultations: Row[];
  dietary: Row[];
  locale?: "fr" | "en";
}) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("anthro");
  const [anthroRows, setAnthro] = useState(anthropometry);
  const [bioRows, setBio] = useState(biology);
  const [foodRows, setFood] = useState(food);
  const [lifestyleRows, setLifestyle] = useState(lifestyle);
  const [message, setMessage] = useState("");
  const anthroTemplates = useMemo(() => customIndicatorTemplates(anthroRows), [anthroRows]);
  const biologyTemplates = useMemo(() => {
    const existing = customIndicatorTemplates(bioRows);
    const byName = new Map(existing.map(item => [item.name.toLocaleLowerCase(), item]));
    const standard = defaultLabParameters.map(item => ({ name: item.name, unit: item.unit, normal_min: null, normal_max: null, ...(byName.get(item.name.toLocaleLowerCase()) || {}) }));
    const standardNames = new Set(standard.map(item => item.name.toLocaleLowerCase()));
    return [...standard, ...existing.filter(item => !standardNames.has(item.name.toLocaleLowerCase()))];
  }, [bioRows]);
  const biologyColumns = useMemo(() => {
    const standard: string[][] = [
      ["measured_at", "Date"], ["glucose", locale === "en" ? "Blood glucose" : "Glyc\u00e9mie"],
      ["hba1c", "HbA1c"], ["total_cholesterol", locale === "en" ? "Total cholesterol" : "Cholest\u00e9rol total"],
      ["ldl", "LDL"], ["hdl", "HDL"], ["triglycerides", "Triglyc\u00e9rides"],
      ["systolic_pressure", locale === "en" ? "Systolic BP" : "TA systolique"],
      ["diastolic_pressure", locale === "en" ? "Diastolic BP" : "TA diastolique"], ["pulse_bpm", locale === "en" ? "Pulse" : "Pouls"],
    ];
    const normalized = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
    const existingLabels = new Set(standard.map(([,label])=>normalized(label)));
    const names = [...new Set(bioRows.flatMap(row => Object.keys(row.custom_values || {})))].filter(name=>!existingLabels.has(normalized(name)));
    const usedStandard = standard.filter(([key])=>key==="measured_at"||bioRows.some(row=>row[key]!=null));
    return [...usedStandard, ...names.map(name => [`custom:${name}`, name])];
  }, [bioRows, locale]);
  const en=locale==="en";
  const tx=(fr:string,english:string)=>en?english:fr;
  const tabLabels:Record<string,string>={anthro:tx("Anthropometrie","Anthropometry"),vitals:tx("Tension arterielle","Blood pressure"),biology:tx("Biologie","Biology"),food:tx("Alimentation","Diet"),lifestyle:tx("Mode de vie","Lifestyle"),consultations:tx("Consultations","Consultations")};

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
      setMessage(tx("Nouvelle donnee ajoutee a votre historique.","New data added to your history."));
    }
  }

  async function addLifestyle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    let bundle: any;
    try { bundle = JSON.parse(String(payload.wellness_assessment || "{}")); }
    catch { setMessage(tx("Le questionnaire est invalide. Rechargez la page et recommencez.","The questionnaire is invalid. Reload the page and try again.")); return; }
    if (!bundle.nutrition?.completed || !bundle.activity?.completed || !bundle.lifestyle?.completed) {
      setMessage(tx("Completez toutes les questions des trois categories avant l enregistrement.","Complete every question in all three categories before saving."));
      return;
    }
    const prioritySignals = [
      ...(bundle.nutrition.keySignals || []).map((item: Row) => ({ ...item, domain: "nutrition" })),
      ...(bundle.activity.keySignals || []).map((item: Row) => ({ ...item, domain: "activity" })),
      ...(bundle.lifestyle.keySignals || []).map((item: Row) => ({ ...item, domain: "lifestyle" })),
    ].slice(0, 12);
    const scoreLevels = {
      nutrition: { level: bundle.nutrition.level, label: bundle.nutrition.levelLabel, interpretation: bundle.nutrition.interpretation },
      activity: { level: bundle.activity.level, label: bundle.activity.levelLabel, interpretation: bundle.activity.interpretation },
      lifestyle: { level: bundle.lifestyle.level, label: bundle.lifestyle.levelLabel, interpretation: bundle.lifestyle.interpretation },
    };
    const { data, error } = await createClient().from("health_lifestyle_assessments").upsert({
      client_id: clientId, assessment_date: payload.assessment_date,
      activity_level: scoreToLegacyLevel(bundle.activity.score), diet_level: scoreToLegacyLevel(bundle.nutrition.score),
      nutrition_score: bundle.nutrition.score, physical_activity_score: bundle.activity.score, lifestyle_score: bundle.lifestyle.score,
      score_levels: scoreLevels, priority_signals: prioritySignals, questionnaire_answers: bundle.answers, questionnaire_snapshot: buildAssessmentSnapshot(bundle.answers), questionnaire_version: "nutvita-wellness-v2", notes: String(payload.notes || "") || null, recorded_by: clientId,
    }, { onConflict: "client_id,assessment_date" }).select().single();
    if (error) {
      const migrationMissing = /nutrition_score|physical_activity_score|lifestyle_score|score_levels|priority_signals|questionnaire_answers|questionnaire_snapshot/i.test(error.message);
      setMessage(migrationMissing ? tx("La migration Supabase health-questionnaires-and-vitals.sql doit etre executee avant l enregistrement.","Run the Supabase health-questionnaires-and-vitals.sql migration before saving.") : error.message);
    } else {
      setLifestyle([data, ...lifestyleRows.filter(row => row.id !== data.id)]);
      form.reset();
      setMessage(tx("Les trois scores ont ete enregistres.","All three scores were saved."));
    }
  }

  async function remove(table: string, id: string, setter: (rows: Row[]) => void, rows: Row[]) {
    if (!window.confirm(tx("Supprimer definitivement cette donnee ?","Permanently delete this record?"))) return;
    const { error } = await createClient().from(table).delete().eq("id", id).eq("client_id", clientId);
    if (error) setMessage(error.message);
    else { setter(rows.filter(row => row.id !== id)); setMessage(tx("Donnee supprimee.","Record deleted.")); }
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
    else { setter(rows.map(item => item.id === row.id ? data : item)); setMessage(tx("Donnee modifiee.","Record updated.")); }
  }

  return <div>
    <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([value]) => <button key={value} onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === value ? "bg-forest text-white" : "bg-white text-forest"}`}>{tabLabels[value]}</button>)}</div>
    {message && <p className="mb-5 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}

    {tab === "anthro" && <><RecordForm locale={locale} title={tx("Ajouter des mesures anthropometriques","Add anthropometric measurements")} onSubmit={event => add("anthropometric_measurements", event, setAnthro, anthroRows)} fields={[["weight_kg", tx("Poids (kg)","Weight (kg)")], ["height_cm", tx("Taille (cm)","Height (cm)")], ["waist_cm", tx("Tour de taille (cm)","Waist circumference (cm)")], ["hip_cm", tx("Tour de hanche (cm)","Hip circumference (cm)")], ["muac_cm", "MUAC (cm)"], ["body_fat_percent", tx("Masse grasse (%)","Body fat (%)")], ["muscle_mass_kg", tx("Masse musculaire (kg)","Muscle mass (kg)")]]} templates={anthroTemplates}/><History locale={locale} rows={anthroRows} columns={[["measured_at", "Date"], ["weight_kg", tx("Poids","Weight")], ["height_cm", tx("Taille","Height")], ["bmi", "BMI"], ["waist_cm", tx("Taille abdominale","Waist")], ["muac_cm", "MUAC"], ["custom_values", tx("Autres mesures","Other measurements")]]} onEdit={(row,columns)=>edit("anthropometric_measurements",row,columns,setAnthro,anthroRows)} onDelete={id=>remove("anthropometric_measurements",id,setAnthro,anthroRows)}/></>}

{tab === "vitals" && <><RecordForm locale={locale} title={tx("Enregistrer la tension arterielle et le pouls","Record blood pressure and pulse")} onSubmit={event => add("biological_measurements", event, setBio, bioRows)} fields={[["systolic_pressure", tx("TA systolique (mmHg)","Systolic BP (mmHg)")], ["diastolic_pressure", tx("TA diastolique (mmHg)","Diastolic BP (mmHg)")], ["pulse_bpm", tx("Pouls (bpm)","Pulse (bpm)")]]} templates={[]}/><History locale={locale} rows={bioRows.filter(row=>row.systolic_pressure!=null||row.diastolic_pressure!=null||row.pulse_bpm!=null)} columns={[["measured_at", "Date"], ["systolic_pressure", tx("TA systolique","Systolic BP")], ["diastolic_pressure", tx("TA diastolique","Diastolic BP")], ["pulse_bpm", tx("Pouls","Pulse")]]} onEdit={(row,columns)=>edit("biological_measurements",row,columns,setBio,bioRows)} onDelete={id=>remove("biological_measurements",id,setBio,bioRows)}/></>}
    {tab === "biology" && <><RecordForm locale={locale} title={tx("Ajouter des param\u00e8tres biologiques","Add biological parameters")} onSubmit={event => add("biological_measurements", event, setBio, bioRows)} fields={[]} templates={biologyTemplates}/><History locale={locale} rows={bioRows} columns={biologyColumns} onEdit={(row,columns)=>edit("biological_measurements",row,columns,setBio,bioRows)} onDelete={id=>remove("biological_measurements",id,setBio,bioRows)}/></>}

    {tab === "food" && <div className="grid gap-7"><HealthDietaryDiversity clientId={clientId} initial={dietary} locale={locale}/><form onSubmit={event => add("food_history", event, setFood, foodRows)} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black md:col-span-2">{locale === "en" ? "Optional food diary" : "Journal alimentaire facultatif"}</h2><label className="grid gap-2 text-sm font-bold">Date<input name="entry_date" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">{locale === "en" ? "Record type" : "Type d'enregistrement"}<select name="entry_type" className="admin-input"><option value="food_diary">{locale === "en" ? "Food diary" : "Journal alimentaire"}</option><option value="habits">{locale === "en" ? "Eating habits" : "Habitudes alimentaires"}</option></select></label><textarea name="notes" required rows={5} className="admin-input md:col-span-2" placeholder={locale === "en" ? "Describe meals, quantities, times and sensations..." : "Decrivez les repas, quantites, horaires et sensations..."}/><button className="btn-primary justify-self-start md:col-span-2">{locale === "en" ? "Add to diary" : "Ajouter au journal"}</button></form><History locale={locale} rows={foodRows} columns={[["entry_date", "Date"], ["entry_type", tx("Type","Type")], ["notes", tx("Contenu","Content")]]} food onEdit={(row,columns)=>edit("food_history",row,columns,setFood,foodRows,true)} onDelete={id=>remove("food_history",id,setFood,foodRows)}/></div>}

    {tab === "lifestyle" && <LifestyleAssessmentRegistry clientId={clientId} initialRows={lifestyleRows} locale={locale}/>}

    {tab === "consultations" && <div className="grid gap-4">{consultations.map(item => <article key={item.id} className="rounded-2xl border bg-white p-6"><p className="text-xs font-bold uppercase text-leaf">{new Date(item.consultation_date).toLocaleString(en?"en-GB":"fr-FR")}</p><h2 className="mt-2 text-xl font-black">{item.summary || tx("Consultation nutritionnelle","Nutrition consultation")}</h2><div className="mt-4 grid gap-3 text-sm"><p><b>{tx("Objectifs","Objectives")}:</b> {item.objectives || "-"}</p><p><b>{tx("Recommandations","Recommendations")}:</b> {item.recommendations || "-"}</p><p><b>{tx("Plan alimentaire","Meal plan")}:</b> {item.meal_plan || "-"}</p></div></article>)}{!consultations.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">{tx("Aucune consultation enregistree.","No consultation recorded.")}</p>}</div>}
  </div>;
}

function RecordForm({ title, onSubmit, fields, templates, locale }: { title: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; fields: string[][]; templates: Array<{ name: string; unit?: string; normal_min?: number | null; normal_max?: number | null }>; locale:"fr"|"en" }) {
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
    <label className="grid gap-2 text-sm font-bold md:col-span-3 md:max-w-sm">{locale==="en"?"Measurement date":"Date de la mesure"}<input name="measured_at" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label>
    {fields.map(([name, label]) => <label key={name} className="grid gap-2 text-sm font-bold">{label}<input name={name} type="number" step="0.01" className="admin-input"/></label>)}
    <div className="rounded-2xl bg-slate-50 p-4 md:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">{locale==="en"?"Other measurements or parameters":"Autres mesures ou parametres"}</h3><p className="text-sm text-slate-500">{locale==="en"?"Added indicators remain available for future records. Add a normal range to enable comparison.":"Les indicateurs ajoutes restent disponibles pour les prochains renseignements. Ajoutez leur plage normale pour permettre la comparaison."}</p></div><button type="button" className="btn-secondary px-4 py-2" onClick={() => setCustom([...custom, { name: "", value: "", unit: "", normalMin: "", normalMax: "" }])}><PlusIcon className="mr-2 h-4"/>{locale==="en"?"Add parameter":"Ajouter un parametre"}</button></div>
      <div className="mt-4 grid gap-3">{custom.map((item, index) => <div key={`${item.name}-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_.8fr_.7fr_.7fr_.7fr_auto]"><input aria-label={locale==="en"?"Parameter name":"Nom du parametre"} className="admin-input" placeholder={locale==="en"?"E.g. Vitamin D":"Ex. Vitamine D"} value={item.name} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, name: event.target.value } : row))}/><input aria-label={locale==="en"?"Parameter value":"Valeur du parametre"} className="admin-input" type="number" step="0.01" placeholder={locale==="en"?"Value":"Valeur"} value={item.value} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, value: event.target.value } : row))}/><input aria-label={locale==="en"?"Parameter unit":"Unite du parametre"} className="admin-input" placeholder={locale==="en"?"Unit":"Unite"} value={item.unit} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, unit: event.target.value } : row))}/><input aria-label={locale==="en"?"Minimum normal value":"Norme minimale"} className="admin-input" type="number" step="0.01" placeholder={locale==="en"?"Normal min.":"Norme min."} value={item.normalMin} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, normalMin: event.target.value } : row))}/><input aria-label={locale==="en"?"Maximum normal value":"Norme maximale"} className="admin-input" type="number" step="0.01" placeholder={locale==="en"?"Normal max.":"Norme max."} value={item.normalMax} onChange={event => setCustom(custom.map((row, i) => i === index ? { ...row, normalMax: event.target.value } : row))}/><button type="button" aria-label={locale==="en"?"Delete this parameter":"Supprimer ce parametre"} className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600" onClick={() => setCustom(custom.filter((_, i) => i !== index))}><TrashIcon className="h-5"/></button></div>)}</div>
    </div>
    <input type="hidden" name="custom_values" value={JSON.stringify(customValues)}/>
    <label className="grid gap-2 text-sm font-bold md:col-span-3">{locale==="en"?"Notes":"Notes"}<textarea name="notes" className="admin-input"/></label><button className="btn-primary justify-self-start md:col-span-3">{locale==="en"?"Save":"Enregistrer"}</button>
  </form>;
}

function LifestyleForm({ rows, onSubmit, locale }: { rows: Row[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; locale:"fr"|"en" }) {
  return <div className="grid gap-6">
    <form onSubmit={onSubmit} className="grid gap-6">
      <label className="grid max-w-sm gap-2 text-sm font-bold">{locale==="en"?"Assessment date":"Date de l'evaluation"}<input name="assessment_date" type="date" defaultValue={today()} max={today()} required className="admin-input"/></label>
      <WellnessQuestionnaires locale={locale}/>
      <label className="grid gap-2 rounded-2xl border bg-white p-5 text-sm font-bold">{locale==="en"?"Optional observations":"Observations facultatives"}<textarea name="notes" rows={3} className="admin-input"/></label>
      <button className="btn-primary justify-self-start">{locale==="en"?"Save assessment":"Enregistrer les trois scores"}</button>
    </form>
    <div className="grid gap-4">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black">Evaluation du {new Date(`${row.assessment_date}T12:00:00`).toLocaleDateString(locale==="en"?"en-GB":"fr-FR")}</h3><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{(row.priority_signals||[]).length} signal(s) prioritaire(s)</span></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ScoreRegistryCard title="Nutrition" score={row.nutrition_score ?? row.diet_level*20} meta={row.score_levels?.nutrition}/>
          <ScoreRegistryCard title="Activite physique" score={row.physical_activity_score ?? row.activity_level*20} meta={row.score_levels?.activity}/>
          <ScoreRegistryCard title="Mode de vie" score={row.lifestyle_score} meta={row.score_levels?.lifestyle}/>
        </div>
        {row.notes&&<p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{row.notes}</p>}
      </article>)}
      {!rows.length&&<p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{locale==="en"?"No assessment.":"Aucune evaluation."}</p>}
    </div>
  </div>;
}
function ScoreRegistryCard({title,score,meta}:{title:string;score?:number|null;meta?:{label?:string;interpretation?:string}}){
  return <section className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-black text-forest">{title}</h4><b className="text-xl text-orange">{score==null?"-":`${score}%`}</b></div><p className="mt-2 text-sm font-black">{meta?.label||"Niveau non disponible"}</p><p className="mt-2 text-xs leading-5 text-slate-600">{meta?.interpretation||"Completez une nouvelle evaluation pour enregistrer le niveau et son interpretation."}</p></section>;
}

function Scale({ name, title, levels,locale }: { name: string; title: string; levels: typeof activityLevels;locale:"fr"|"en" }) {
  return <fieldset><legend className="mb-3 font-black">{title}</legend><div className="grid gap-3 sm:grid-cols-5">{levels.map(level => <label key={level.value} title={locale==="en"?level.descriptionEn:level.description} className="group relative cursor-pointer"><input type="radio" name={name} value={level.value} required className="peer sr-only"/><span className="grid min-h-20 place-items-center rounded-xl border bg-white p-3 text-center text-sm font-bold transition peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white">{locale==="en"?level.labelEn:level.label}<small className="mt-1 block font-normal opacity-70">{level.value}/5</small></span><span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-950 p-3 text-xs font-normal leading-5 text-white shadow-xl group-hover:block">{locale==="en"?level.descriptionEn:level.description}</span></label>)}</div></fieldset>;
}

function History({ rows, columns, food = false, onEdit, onDelete,locale }: { rows: Row[]; columns: string[][]; food?: boolean; onEdit?: (row:Row,columns:string[][])=>void; onDelete?: (id:string)=>void;locale:"fr"|"en" }) {
  function display(row: Row, key: string) {
    if (key.includes("date") || key === "measured_at") return row[key] ? new Date(`${String(row[key]).slice(0, 10)}T12:00:00`).toLocaleDateString(locale==="en"?"en-GB":"fr-FR") : "-";
    if (food && key === "calories") return row.content?.calories ?? "-";
    if (key.startsWith("custom:")) {
      const item = row.custom_values?.[key.slice(7)];
      if (item == null) return "-";
      return `${typeof item === "object" ? item.value : item}${typeof item === "object" && item.unit ? ` ${item.unit}` : ""}`;
    }
    if (key === "custom_values") {
      const entries = Object.entries(row.custom_values || {});
      return entries.length ? entries.map(([name, raw]) => {
        const item = raw as any;
        return `${name}: ${typeof item === "object" ? item.value : item}${typeof item === "object" && item.unit ? ` ${item.unit}` : ""}`;
      }).join(" | ") : "-";
    }
    return row[key] ?? "-";
  }
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px]"><thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400"><tr>{columns.map(([, label]) => <th key={label} className="p-4">{label}</th>)}{(onEdit||onDelete)&&<th className="p-4">Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b">{columns.map(([key]) => <td key={key} className="p-4 text-sm">{display(row, key)}</td>)}{(onEdit||onDelete)&&<td className="p-4"><div className="flex gap-2">{onEdit&&<button onClick={()=>onEdit(row,columns)} className="rounded-lg border px-3 py-2 text-xs font-bold">{locale==="en"?"Edit":"Modifier"}</button>}{onDelete&&<button onClick={()=>onDelete(row.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{locale==="en"?"Delete":"Supprimer"}</button>}</div></td>}</tr>)}{!rows.length && <tr><td colSpan={columns.length+(onEdit||onDelete?1:0)} className="p-8 text-center text-slate-400">{locale==="en"?"No data.":"Aucune donnee."}</td></tr>}</tbody></table></div>;
}
