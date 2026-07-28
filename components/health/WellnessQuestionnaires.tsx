"use client";

import { useMemo, useState } from "react";
import {
  assessmentQuestions,
  buildAssessmentBundle,
  type AssessmentAnswer,
  type AssessmentKind,
  type WellnessAssessmentBundle,
} from "@/lib/wellness-assessments";

const labels: Record<AssessmentKind, { title: string; subtitle: string }> = {
  nutrition: { title: "Nutrition Score NutVita™", subtitle: "Habitudes alimentaires des 7 derniers jours" },
  activity: { title: "Score d’activité physique", subtitle: "Sport, mobilité quotidienne et sédentarité" },
  lifestyle: { title: "Lifestyle Score NutVita™", subtitle: "Sommeil, stress, comportements et bien-être" },
};

export default function WellnessQuestionnaires({
  onChange,
  compact = false,
}: {
  onChange?: (bundle: WellnessAssessmentBundle) => void;
  compact?: boolean;
}) {
  const [active, setActive] = useState<AssessmentKind>("nutrition");
  const [answers, setAnswers] = useState<Record<AssessmentKind, AssessmentAnswer>>({ nutrition: {}, activity: {}, lifestyle: {} });
  const bundle = useMemo(() => buildAssessmentBundle(answers), [answers]);

  function answer(kind: AssessmentKind, questionId: string, score: number) {
    const next = { ...answers, [kind]: { ...answers[kind], [questionId]: score } };
    setAnswers(next);
    onChange?.(buildAssessmentBundle(next));
  }

  const result = bundle[active];
  return <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-soft md:p-6">
    <div>
      <h2 className="text-xl font-black text-forest">Évaluation structurée des 7 derniers jours</h2>
      <p className="mt-2 text-sm text-slate-500">Les réponses détaillées servent au calcul immédiat. Seuls les scores, le niveau et les signaux prioritaires seront conservés dans le dossier.</p>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      {(Object.keys(labels) as AssessmentKind[]).map(kind => <button type="button" key={kind} onClick={() => setActive(kind)} className={`rounded-full px-4 py-2 text-sm font-black ${active === kind ? "bg-forest text-white" : "bg-mint text-forest"}`}>{labels[kind].title}</button>)}
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
      <div><h3 className="font-black">{labels[active].title}</h3><p className="text-sm text-slate-500">{labels[active].subtitle}</p></div>
      <div className="text-right"><b className="text-2xl text-orange">{result.score}%</b><p className="text-xs font-bold uppercase text-slate-500">{levelLabel(result.level)} · {result.rawScore}/{result.maxScore}</p></div>
    </div>
    <div className={`mt-5 grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
      {assessmentQuestions[active].map((question, index) => <fieldset key={question.id} className="rounded-2xl border bg-white p-4">
        <legend className="px-1 text-sm font-black">{index + 1}. {question.title}</legend>
        {question.help && <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{question.help}</p>}
        <div className="mt-3 grid gap-2">
          {question.options.map(option => <label key={`${question.id}-${option.label}`} className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm transition hover:bg-mint">
            <input type="radio" name={`${active}_${question.id}`} checked={answers[active][question.id] === option.score} onChange={() => answer(active, question.id, option.score)}/>
            <span>{option.label}</span>
          </label>)}
        </div>
      </fieldset>)}
    </div>
    {!result.completed && <p className="mt-4 rounded-xl bg-orange/10 p-3 text-sm font-bold text-orange">Complétez les {assessmentQuestions[active].length} questions pour valider ce score.</p>}
    <input type="hidden" name="wellness_assessment" value={JSON.stringify(bundle)}/>
  </section>;
}

function levelLabel(level: string) {
  return ({ very_low: "Très faible", low: "Faible", moderate: "Modéré", good: "Bon", excellent: "Excellent" } as Record<string, string>)[level] || level;
}
