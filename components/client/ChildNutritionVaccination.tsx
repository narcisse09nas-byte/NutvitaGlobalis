// @ts-nocheck -- Supabase assessment rows and vaccination schedule are JSON-backed.
"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ageInMonths, calculateIycf, calculateMddw, childFoodItems, mddwFoodItems } from "@/lib/dietary-diversity";
import { getDueVaccines } from "@/nutritrack/lib/vaccination-schedule";

type Row = Record<string, any>;
type Locale = "fr" | "en";

const copy = {
  fr: {
    feeding: "Evaluation de l'alimentation",
    feeding623: "Questionnaire MDD, MMF et MAD (6-23 mois)",
    feeding24: "Questionnaire de diversite alimentaire (24 mois et plus)",
    intro: "Rappelez tous les aliments, repas et boissons consommes par l'enfant hier, pendant la journee et la nuit. Les petites quantites utilisees uniquement comme condiment ne comptent pas.",
    notApplicable: "Les indicateurs MDD, MMF et MAD sont applicables a partir de 6 mois. La vaccination peut deja etre evaluee.",
    date: "Date du rappel",
    breastfed: "L'enfant a-t-il recu du lait maternel hier, directement ou exprime ?",
    solidMeals: "Nombre de repas solides, semi-solides ou mous",
    solidMealsExample: "Ex. : bouillie epaisse enrichie, puree, riz ou pate avec sauce, legumes ecrases.",
    formulaFeeds: "Nombre de prises de formule infantile",
    formulaFeedsExample: "Ex. : biberon de lait infantile prepare selon les instructions.",
    animalMilkFeeds: "Nombre de prises de lait animal",
    animalMilkFeedsExample: "Ex. : lait de vache, chevre ou autre lait animal, nature ou dans une preparation.",
    yogurtFeeds: "Nombre de prises de yaourt liquide",
    yogurtFeedsExample: "Ex. : yaourt a boire ou lait fermente liquide donne comme boisson.",
    groupQuestion: "L'enfant a-t-il consomme hier un aliment de ce groupe ?",
    examples: "Exemples",
    yes: "Oui", no: "Non",
    notes: "Appetit, maladie recente, journee inhabituelle ou observations",
    save: "Evaluer et enregistrer l'alimentation",
    vaccination: "Evaluation du statut vaccinal selon l'age",
    vaccineIntro: "Vaccins ou interventions attendus jusqu'a cet age selon le calendrier configure. Verifiez de preference le carnet de vaccination.",
    sourceNotes: "Source utilisee, carnet vaccinal ou observations",
    assessVaccine: "Evaluer le statut vaccinal",
    foodHistory: "Evaluations alimentaires",
    vaccineHistory: "Evaluations vaccinales",
    upToDate: "A jour", notUpToDate: "Non a jour",
    achieved: "atteint", notAchieved: "non atteint",
    foodSaved: "Evaluation alimentaire enregistree et analysee.",
    vaccineSaved: "Statut vaccinal evalue et enregistre.",
  },
  en: {
    feeding: "Feeding assessment",
    feeding623: "MDD, MMF and MAD questionnaire (6-23 months)",
    feeding24: "Dietary diversity questionnaire (24 months and older)",
    intro: "Recall all foods, meals and drinks consumed by the child yesterday, during the day and night. Small amounts used only as condiments do not count.",
    notApplicable: "MDD, MMF and MAD indicators apply from 6 months of age. Vaccination can already be assessed.",
    date: "Recall date",
    breastfed: "Did the child receive breast milk yesterday, directly or expressed?",
    solidMeals: "Number of solid, semi-solid or soft meals",
    solidMealsExample: "E.g. thick enriched porridge, puree, rice or paste with sauce, mashed vegetables.",
    formulaFeeds: "Number of infant formula feeds",
    formulaFeedsExample: "E.g. a bottle of infant formula prepared according to instructions.",
    animalMilkFeeds: "Number of animal milk feeds",
    animalMilkFeedsExample: "E.g. cow, goat or other animal milk, plain or used in a preparation.",
    yogurtFeeds: "Number of liquid yogurt feeds",
    yogurtFeedsExample: "E.g. drinking yogurt or liquid fermented milk given as a drink.",
    groupQuestion: "Did the child consume any food from this group yesterday?",
    examples: "Examples",
    yes: "Yes", no: "No",
    notes: "Appetite, recent illness, unusual day or observations",
    save: "Assess and save feeding",
    vaccination: "Age-appropriate vaccination assessment",
    vaccineIntro: "Vaccines or interventions expected by this age according to the configured schedule. Preferably verify the vaccination card.",
    sourceNotes: "Source used, vaccination card or observations",
    assessVaccine: "Assess vaccination status",
    foodHistory: "Feeding assessments",
    vaccineHistory: "Vaccination assessments",
    upToDate: "Up to date", notUpToDate: "Not up to date",
    achieved: "met", notAchieved: "not met",
    foodSaved: "Feeding assessment saved and analysed.",
    vaccineSaved: "Vaccination status saved.",
  },
};

export default function ChildNutritionVaccination({ child, userId, feeding: initialFeeding, vaccinations: initialVaccinations, locale = "fr", embedded = false }: { child: Row; userId: string; feeding: Row[]; vaccinations: Row[]; locale?: Locale; embedded?: boolean }) {
  const [feeding, setFeeding] = useState(initialFeeding);
  const [vaccinations, setVaccinations] = useState(initialVaccinations);
  const [message, setMessage] = useState("");
  const [assessment, setAssessment] = useState<"feeding" | "vaccination">("feeding");
  const months = ageInMonths(child.birth_date);
  const t = copy[locale];
  const groups = months < 24 ? childFoodItems : mddwFoodItems;
  const dueVaccines = useMemo(() => getDueVaccines(months).flatMap(entry => entry.vaccines.map((vaccine, index) => ({ ...vaccine, contact: entry.contact, key: `${entry.contact}-${index}-${vaccine.name}` }))), [months]);

  async function saveFeeding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const items = Object.fromEntries(groups.map(({ key }) => [key, values.get(`food_${key}`) === "yes"]));
    let payload: Row;
    if (months < 24) {
      const input = { ageMonths: months, breastfed: values.get("breastfed") === "yes", solidMeals: Number(values.get("solid_meals") || 0), formulaFeeds: Number(values.get("formula_feeds") || 0), animalMilkFeeds: Number(values.get("animal_milk_feeds") || 0), yogurtDrinkFeeds: Number(values.get("yogurt_drink_feeds") || 0), foods: items };
      const result = calculateIycf(input);
      payload = { child_id: child.id, assessed_at: values.get("assessed_at"), age_months: months, module: "iycf_6_23", breastfed: input.breastfed, solid_meals: input.solidMeals, formula_feeds: input.formulaFeeds, animal_milk_feeds: input.animalMilkFeeds, yogurt_drink_feeds: input.yogurtDrinkFeeds, food_items: items, group_scores: result.groups, diversity_score: result.mddScore, mdd_met: result.mddMet, mmf_met: result.mmfMet, mmff_met: result.mmffMet, mad_met: result.madMet, notes: values.get("notes") || null, created_by: userId };
    } else {
      const result = calculateMddw(items);
      payload = { child_id: child.id, assessed_at: values.get("assessed_at"), age_months: months, module: "dietary_diversity_24_plus", food_items: items, group_scores: result.groups, diversity_score: result.score, mdd_met: result.met, notes: values.get("notes") || null, created_by: userId };
    }
    const { data, error } = await createClient().from("child_feeding_assessments").insert(payload).select().single();
    if (error) setMessage(error.message);
    else { setFeeding([data, ...feeding]); form.reset(); setMessage(t.foodSaved); }
  }

  async function saveVaccination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const vaccines = Object.fromEntries(dueVaccines.map(vaccine => [vaccine.key, { name: vaccine.name, received: values.get(`vaccine_${vaccine.key}`) === "on", date: values.get(`date_${vaccine.key}`) || null, disease: vaccine.disease, contact: vaccine.contact }]));
    const received = Object.values(vaccines).filter((value: any) => value.received).length;
    const payload = { child_id: child.id, assessed_at: values.get("assessed_at"), age_months: months, vaccines, due_count: dueVaccines.length, received_count: received, up_to_date: dueVaccines.length > 0 && received === dueVaccines.length, notes: values.get("notes") || null, created_by: userId };
    const { data, error } = await createClient().from("child_vaccination_assessments").insert(payload).select().single();
    if (error) setMessage(error.message);
    else { setVaccinations([data, ...vaccinations]); form.reset(); setMessage(t.vaccineSaved); }
  }

  return <section className={`grid gap-7 ${embedded ? "" : "rounded-2xl border bg-white p-6"}`}>
    <div className="flex flex-wrap gap-2 border-b pb-5">
      <button type="button" onClick={() => setAssessment("feeding")} className={assessment === "feeding" ? "btn-primary" : "btn-secondary"}>{t.feeding}</button>
      <button type="button" onClick={() => setAssessment("vaccination")} className={assessment === "vaccination" ? "btn-primary" : "btn-secondary"}>{t.vaccination}</button>
    </div>
    {assessment === "feeding" && <div id="child-feeding-assessment" className="grid gap-5">
      <div><h2 className="text-xl font-black">{t.feeding}</h2><p className="mt-2 text-sm text-slate-600">{months < 6 ? t.notApplicable : months < 24 ? t.feeding623 : t.feeding24}</p></div>
    {months >= 6 && <form onSubmit={saveFeeding} className="grid gap-5">
      <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{t.intro}</p>
      <label className="grid max-w-xs gap-2 text-sm font-bold">{t.date}<input name="assessed_at" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className="admin-input"/></label>
      {months < 24 && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-2 text-sm font-bold">{t.breastfed}<select name="breastfed" className="admin-input"><option value="yes">{t.yes}</option><option value="no">{t.no}</option></select></label>
        <NumberField name="solid_meals" label={t.solidMeals} example={t.solidMealsExample}/><NumberField name="formula_feeds" label={t.formulaFeeds} example={t.formulaFeedsExample}/><NumberField name="animal_milk_feeds" label={t.animalMilkFeeds} example={t.animalMilkFeedsExample}/><NumberField name="yogurt_drink_feeds" label={t.yogurtFeeds} example={t.yogurtFeedsExample}/>
      </div>}
      <div className="grid gap-3">{groups.map(group => <fieldset key={group.key} className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div><legend className="font-black">{locale === "en" ? group.labelEn : group.labelFr}</legend><p className="mt-1 text-sm text-slate-600"><b>{t.examples}:</b> {locale === "en" ? group.examplesEn : group.examplesFr}</p></div>
        <div><p className="mb-2 text-xs font-bold text-slate-500">{t.groupQuestion}</p><div className="flex gap-5">{["yes", "no"].map(value => <label key={value} className="flex items-center gap-2 text-sm font-bold"><input type="radio" name={`food_${group.key}`} value={value} required className="h-4 w-4"/>{value === "yes" ? t.yes : t.no}</label>)}</div></div>
      </fieldset>)}</div>
      <textarea name="notes" className="admin-input min-h-24" placeholder={t.notes}/>
      <button className="btn-primary justify-self-start">{t.save}</button>
    </form>}
    </div>}
    {assessment === "vaccination" && <div id="child-vaccination-assessment"><VaccinationForm due={dueVaccines} submit={saveVaccination} locale={locale}/></div>}
    <History feeding={feeding} vaccinations={vaccinations} locale={locale}/>
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
  </section>;
}

function VaccinationForm({ due, submit, locale }: { due: Row[]; submit: (event: FormEvent<HTMLFormElement>) => void; locale: Locale }) {
  const t = copy[locale];
  return <form onSubmit={submit} className="grid gap-4 border-t pt-6"><div><h3 className="font-black">{t.vaccination}</h3><p className="mt-1 text-sm text-slate-500">{t.vaccineIntro}</p></div><input name="assessed_at" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className="admin-input max-w-xs"/><div className="grid gap-2 md:grid-cols-2">{due.map(vaccine => <div key={vaccine.key} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_150px]"><label className="flex gap-3 text-sm"><input type="checkbox" name={`vaccine_${vaccine.key}`} className="h-5 w-5"/><span><b>{vaccine.name}</b><small className="block text-slate-500">{vaccine.contact} - {vaccine.disease}</small></span></label><input type="date" name={`date_${vaccine.key}`} aria-label={`Date ${vaccine.name}`} className="admin-input"/></div>)}</div><textarea name="notes" className="admin-input" placeholder={t.sourceNotes}/><button className="btn-secondary justify-self-start">{t.assessVaccine}</button></form>;
}

function History({ feeding, vaccinations, locale }: { feeding: Row[]; vaccinations: Row[]; locale: Locale }) {
  const t = copy[locale];
  const yes = (value: boolean | null) => value === null ? "N/A" : value ? t.achieved : t.notAchieved;
  return <div className="grid gap-5 border-t pt-5 md:grid-cols-2"><div><h3 className="font-black">{t.foodHistory}</h3>{feeding.slice(0, 4).map(row => <p key={row.id} className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">{new Date(`${row.assessed_at}T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")} - {row.diversity_score ?? "N/A"} - {row.module === "iycf_6_23" ? `MDD ${yes(row.mdd_met)}, MMF ${yes(row.mmf_met)}, MAD ${yes(row.mad_met)}` : `MDD-W ${yes(row.mdd_met)}`}</p>)}</div><div><h3 className="font-black">{t.vaccineHistory}</h3>{vaccinations.slice(0, 4).map(row => <p key={row.id} className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">{new Date(`${row.assessed_at}T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")} - {row.received_count}/{row.due_count} - <b>{row.up_to_date ? t.upToDate : t.notUpToDate}</b></p>)}</div></div>;
}

function NumberField({ name, label, example }: { name: string; label: string; example: string }) {
  return <label className="grid content-start gap-2 text-sm font-bold">{label}<input name={name} type="number" min="0" max="20" defaultValue="0" className="admin-input"/><small className="font-normal leading-5 text-slate-500">{example}</small></label>;
}
