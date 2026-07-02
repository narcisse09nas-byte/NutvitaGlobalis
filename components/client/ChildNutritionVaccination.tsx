// @ts-nocheck -- Supabase assessment rows are JSON-backed.
"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ageInMonths, calculateIycf, calculateMddw, childFoodItems, mddwFoodItems } from "@/lib/dietary-diversity";
import { getDueVaccines } from "@/nutritrack/lib/vaccination-schedule";

type Row = Record<string, any>;

export default function ChildNutritionVaccination({ child, userId, feeding: initialFeeding, vaccinations: initialVaccinations }: { child: Row; userId: string; feeding: Row[]; vaccinations: Row[] }) {
  const [feeding, setFeeding] = useState(initialFeeding), [vaccinations, setVaccinations] = useState(initialVaccinations), [message, setMessage] = useState("");
  const months = ageInMonths(child.birth_date);
  const dueVaccines = useMemo(() => getDueVaccines(months).flatMap(entry => entry.vaccines.map((vaccine, index) => ({ ...vaccine, contact: entry.contact, key: `${entry.contact}-${index}-${vaccine.name}` }))), [months]);

  async function saveFeeding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const items = Object.fromEntries((months < 24 ? childFoodItems : mddwFoodItems).map(([key]) => [key, values.get(`food_${key}`) === "on"]));
    let payload: Row;
    if (months >= 6 && months < 24) {
      const input = { ageMonths: months, breastfed: values.get("breastfed") === "yes", solidMeals: Number(values.get("solid_meals") || 0), formulaFeeds: Number(values.get("formula_feeds") || 0), animalMilkFeeds: Number(values.get("animal_milk_feeds") || 0), yogurtDrinkFeeds: Number(values.get("yogurt_drink_feeds") || 0), foods: items };
      const result = calculateIycf(input);
      payload = { child_id: child.id, assessed_at: values.get("assessed_at"), age_months: months, module: "iycf_6_23", breastfed: input.breastfed, solid_meals: input.solidMeals, formula_feeds: input.formulaFeeds, animal_milk_feeds: input.animalMilkFeeds, yogurt_drink_feeds: input.yogurtDrinkFeeds, food_items: items, group_scores: result.groups, diversity_score: result.mddScore, mdd_met: result.mddMet, mmf_met: result.mmfMet, mmff_met: result.mmffMet, mad_met: result.madMet, notes: values.get("notes") || null, created_by: userId };
    } else {
      const result = calculateMddw(items);
      payload = { child_id: child.id, assessed_at: values.get("assessed_at"), age_months: months, module: "dietary_diversity_24_plus", food_items: items, group_scores: result.groups, diversity_score: result.score, mdd_met: result.met, notes: values.get("notes") || null, created_by: userId };
    }
    const { data, error } = await createClient().from("child_feeding_assessments").insert(payload).select().single();
    if (error) setMessage(error.message); else { setFeeding([data, ...feeding]); form.reset(); setMessage("Evaluation alimentaire enregistree et analysee."); }
  }

  async function saveVaccination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const vaccines = Object.fromEntries(dueVaccines.map(vaccine => [vaccine.key, { name:vaccine.name, received: values.get(`vaccine_${vaccine.key}`) === "on", date: values.get(`date_${vaccine.key}`) || null, disease: vaccine.disease, contact: vaccine.contact }]));
    const received = Object.values(vaccines).filter((value: any) => value.received).length;
    const payload = { child_id: child.id, assessed_at: values.get("assessed_at"), age_months: months, vaccines, due_count: dueVaccines.length, received_count: received, up_to_date: dueVaccines.length > 0 && received === dueVaccines.length, notes: values.get("notes") || null, created_by: userId };
    const { data, error } = await createClient().from("child_vaccination_assessments").insert(payload).select().single();
    if (error) setMessage(error.message); else { setVaccinations([data, ...vaccinations]); form.reset(); setMessage("Statut vaccinal enregistre."); }
  }

  if (months < 6) return <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Alimentation complementaire et vaccination</h2><p className="mt-3 text-sm text-slate-600">Le module MMF/MDD/MAD devient applicable a partir de 6 mois. L enfant a actuellement {months} mois.</p><VaccinationForm due={dueVaccines} submit={saveVaccination}/><History feeding={feeding} vaccinations={vaccinations}/>{message&&<Message value={message}/>}</section>;
  return <section className="grid gap-6 rounded-2xl border bg-white p-6">
    <div><h2 className="text-xl font-black">{months < 24 ? "Alimentation complementaire (6-23 mois)" : "Diversite alimentaire (24 mois et plus)"}</h2><p className="mt-2 text-sm text-slate-500">{months < 24 ? "Rappel des aliments et repas consommes hier, avec calcul automatique MDD, MMF, MMFF et MAD." : "Rappel alimentaire adapte de MDD-W, calcule sur 10 groupes alimentaires."}</p></div>
    <form onSubmit={saveFeeding} className="grid gap-4">
      <input name="assessed_at" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className="admin-input max-w-xs"/>
      {months < 24 && <div className="grid gap-4 md:grid-cols-4"><label className="grid gap-2 text-sm font-bold">Allaite hier ?<select name="breastfed" className="admin-input"><option value="yes">Oui</option><option value="no">Non</option></select></label><NumberField name="solid_meals" label="Repas solides/semi-solides"/><NumberField name="formula_feeds" label="Prises de formule"/><NumberField name="animal_milk_feeds" label="Prises de lait animal"/><NumberField name="yogurt_drink_feeds" label="Boissons yaourt"/></div>}
      <fieldset><legend className="mb-3 font-black">Consommation au cours de la journee et de la nuit precedentes</legend><div className="grid gap-2 md:grid-cols-2">{(months < 24 ? childFoodItems : mddwFoodItems).map(([key,label])=><label key={key} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" name={`food_${key}`} className="h-5 w-5"/><span>{label}</span></label>)}</div></fieldset>
      <textarea name="notes" className="admin-input" placeholder="Observations: appetit, maladie, contexte du rappel..."/>
      <button className="btn-primary justify-self-start">Analyser et enregistrer</button>
    </form>
    <VaccinationForm due={dueVaccines} submit={saveVaccination}/>
    <History feeding={feeding} vaccinations={vaccinations}/>
    {message&&<Message value={message}/>}
  </section>;
}

function VaccinationForm({due,submit}:{due:Row[];submit:(event:FormEvent<HTMLFormElement>)=>void}){return <form onSubmit={submit} className="grid gap-4 border-t pt-6"><div><h3 className="font-black">Vaccination selon l age</h3><p className="text-sm text-slate-500">{due.length} vaccin(s) ou intervention(s) attendu(s) jusqu a cet age, selon le calendrier NutriTrack configure.</p></div><input name="assessed_at" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className="admin-input max-w-xs"/><div className="grid gap-2 md:grid-cols-2">{due.map(vaccine=><div key={vaccine.key} className="grid grid-cols-[1fr_150px] gap-3 rounded-xl bg-slate-50 p-3"><label className="flex gap-3 text-sm"><input type="checkbox" name={`vaccine_${vaccine.key}`} className="h-5 w-5"/><span><b>{vaccine.name}</b><small className="block text-slate-500">{vaccine.contact} - {vaccine.disease}</small></span></label><input type="date" name={`date_${vaccine.key}`} aria-label={`Date ${vaccine.name}`} className="admin-input"/></div>)}</div><textarea name="notes" className="admin-input" placeholder="Source, carte vaccinale ou observations"/><button className="btn-secondary justify-self-start">Evaluer le statut vaccinal</button></form>}
function History({feeding,vaccinations}:{feeding:Row[];vaccinations:Row[]}){return <div className="grid gap-3 border-t pt-5 md:grid-cols-2"><div><h3 className="font-black">Evaluations alimentaires</h3>{feeding.slice(0,4).map(row=><p key={row.id} className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">{new Date(`${row.assessed_at}T12:00:00`).toLocaleDateString("fr-FR")} - Diversite {row.diversity_score ?? "N/A"} - {row.module==="iycf_6_23"?`MDD ${yes(row.mdd_met)}, MMF ${yes(row.mmf_met)}, MAD ${yes(row.mad_met)}`:`Seuil adapte ${yes(row.mdd_met)}`}</p>)}</div><div><h3 className="font-black">Evaluations vaccinales</h3>{vaccinations.slice(0,4).map(row=><p key={row.id} className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">{new Date(`${row.assessed_at}T12:00:00`).toLocaleDateString("fr-FR")} - {row.received_count}/{row.due_count} - <b>{row.up_to_date?"A jour":"Non a jour"}</b></p>)}</div></div>}
function NumberField({name,label}:{name:string;label:string}){return <label className="grid gap-2 text-sm font-bold">{label}<input name={name} type="number" min="0" max="20" defaultValue="0" className="admin-input"/></label>}
function yes(value:boolean|null){return value===null?"N/A":value?"atteint":"non atteint"}
function Message({value}:{value:string}){return <p className="rounded-xl bg-mint p-4 font-bold text-forest">{value}</p>}
