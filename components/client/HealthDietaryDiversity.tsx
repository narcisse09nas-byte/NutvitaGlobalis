"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateMddw, mddwFoodItems } from "@/lib/dietary-diversity";

type Row = Record<string, any>;
type Locale = "fr" | "en";

const text = {
  fr: {
    title: "Questionnaire de diversite alimentaire",
    intro: "Pensez a tout ce que vous avez mange et bu hier, pendant la journee et la nuit, a domicile ou ailleurs. Selectionnez Oui uniquement si au moins un aliment du groupe a ete consomme; les epices et condiments en tres petite quantite ne comptent pas.",
    date: "Date du rappel",
    question: "Avez-vous consomme hier un aliment de ce groupe ?",
    yes: "Oui",
    no: "Non",
    examples: "Exemples",
    notes: "Contexte du rappel, repas inhabituels ou observations",
    submit: "Analyser et enregistrer",
    history: "Evaluations recentes",
    score: "Score de diversite",
    met: "seuil atteint",
    unmet: "seuil non atteint",
    saved: "Evaluation enregistree",
  },
  en: {
    title: "Dietary diversity questionnaire",
    intro: "Think about everything you ate and drank yesterday, during the day and night, at home or elsewhere. Select Yes only when at least one food from the group was consumed; spices and condiments used in very small amounts do not count.",
    date: "Recall date",
    question: "Did you consume any food from this group yesterday?",
    yes: "Yes",
    no: "No",
    examples: "Examples",
    notes: "Recall context, unusual meals or observations",
    submit: "Analyse and save",
    history: "Recent assessments",
    score: "Diversity score",
    met: "threshold met",
    unmet: "threshold not met",
    saved: "Assessment saved",
  },
};

export default function HealthDietaryDiversity({ clientId, initial, locale = "fr" }: { clientId: string; initial: Row[]; locale?: Locale }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");
  const t = text[locale];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const foods = Object.fromEntries(mddwFoodItems.map(({ key }) => [key, values.get(`food_${key}`) === "yes"]));
    const result = calculateMddw(foods);
    const { data, error } = await createClient().from("health_dietary_diversity_assessments").insert({
      client_id: clientId,
      assessed_at: values.get("assessed_at"),
      food_items: foods,
      group_scores: result.groups,
      diversity_score: result.score,
      mddw_met: result.met,
      notes: values.get("notes") || null,
      created_by: clientId,
    }).select().single();
    if (error) setMessage(error.message);
    else {
      setRows([data, ...rows]);
      form.reset();
      setMessage(`${t.saved}: ${result.score}/10, ${result.met ? t.met : t.unmet}.`);
    }
  }

  return <div className="grid gap-5">
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6">
      <div><h2 className="text-xl font-black">{t.title}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{t.intro}</p></div>
      <label className="grid max-w-xs gap-2 text-sm font-bold">{t.date}<input name="assessed_at" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className="admin-input"/></label>
      <div className="grid gap-3">
        {mddwFoodItems.map(group => <fieldset key={group.key} className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div><legend className="font-black">{locale === "en" ? group.labelEn : group.labelFr}</legend><p className="mt-1 text-sm text-slate-600"><b>{t.examples}:</b> {locale === "en" ? group.examplesEn : group.examplesFr}</p></div>
          <div><p className="mb-2 text-xs font-bold text-slate-500">{t.question}</p><div className="flex gap-5">{["yes", "no"].map(value => <label key={value} className="flex items-center gap-2 text-sm font-bold"><input type="radio" name={`food_${group.key}`} value={value} required className="h-4 w-4"/>{value === "yes" ? t.yes : t.no}</label>)}</div></div>
        </fieldset>)}
      </div>
      <textarea name="notes" className="admin-input min-h-24" placeholder={t.notes}/>
      <button className="btn-primary justify-self-start">{t.submit}</button>
    </form>
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    {!!rows.length && <div><h3 className="mb-3 font-black">{t.history}</h3><div className="grid gap-3">{rows.map(row => <article key={row.id} className="rounded-xl border bg-white p-4"><b>{new Date(`${row.assessed_at}T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}</b><p className="mt-1 text-sm">{t.score}: {row.diversity_score}/10 - {row.mddw_met ? t.met : t.unmet}</p></article>)}</div></div>}
  </div>;
}
