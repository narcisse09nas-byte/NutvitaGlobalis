"use client";

import { useMemo, useState } from "react";
import { assessmentQuestions, buildAssessmentBundle, type AssessmentAnswer, type AssessmentKind, type WellnessAssessmentBundle } from "@/lib/wellness-assessments-v2";

const fr = {
  nutrition:["Nutrition Score NutVita™","Habitudes alimentaires des 7 derniers jours"],
  activity:["Score d’activité physique","Sport, mobilité quotidienne et sédentarité"],
  lifestyle:["Lifestyle Score NutVita™","Sommeil, stress, comportements et bien-être"],
} satisfies Record<AssessmentKind,[string,string]>;
const en = {
  nutrition:["NutVita™ Nutrition Score","Eating habits over the last 7 days"],
  activity:["Physical activity score","Exercise, daily mobility and sedentary time"],
  lifestyle:["NutVita™ Lifestyle Score","Sleep, stress, behaviours and well-being"],
} satisfies Record<AssessmentKind,[string,string]>;

export default function WellnessQuestionnairesV2({onChange,compact=false,locale="fr"}:{onChange?:(bundle:WellnessAssessmentBundle)=>void;compact?:boolean;locale?:"fr"|"en"}) {
  const [active,setActive]=useState<AssessmentKind>("nutrition");
  const [answers,setAnswers]=useState<Record<AssessmentKind,AssessmentAnswer>>({nutrition:{},activity:{},lifestyle:{}});
  const bundle=useMemo(()=>buildAssessmentBundle(answers),[answers]);
  const labels=locale==="en"?en:fr;
  const tx=(a:string,b:string)=>locale==="en"?b:a;
  const answer=(kind:AssessmentKind,id:string,score:number)=>{
    const next={...answers,[kind]:{...answers[kind],[id]:score}};
    setAnswers(next); onChange?.(buildAssessmentBundle(next));
  };
  const result=bundle[active];
  return <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-soft md:p-6">
    <h2 className="text-xl font-black text-forest">{tx("Évaluation structurée des 7 derniers jours","Structured assessment of the last 7 days")}</h2>
    <p className="mt-2 text-sm text-slate-500">{tx("Toutes les réponses sont conservées avec les scores afin d’améliorer la qualité de l’analyse.","All answers are stored with the scores to improve analysis quality.")}</p>
    <div className="mt-5 flex flex-wrap gap-2">{(Object.keys(labels) as AssessmentKind[]).map(kind=><button type="button" key={kind} onClick={()=>setActive(kind)} className={`rounded-full px-4 py-2 text-sm font-black ${active===kind?"bg-forest text-white":"bg-mint text-forest"}`}>{labels[kind][0]}</button>)}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
      <div><h3 className="font-black">{labels[active][0]}</h3><p className="text-sm text-slate-500">{labels[active][1]}</p></div>
      <div className="text-right"><b className="text-2xl text-orange">{result.score}%</b><p className="text-xs font-bold uppercase text-slate-500">{result.levelLabel} · {result.rawScore}/{result.maxScore}</p></div>
    </div>
    <div className={`mt-5 grid gap-4 ${compact?"":"lg:grid-cols-2"}`}>
      {assessmentQuestions[active].map((question,index)=><fieldset key={question.id} className="rounded-2xl border bg-white p-4">
        <legend className="px-1 text-sm font-black">{index+1}. {question.title}</legend>
        <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{question.help}</p>
        <div className="grid gap-2">{question.options.map(option=><label key={`${question.id}-${option.label}`} className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm transition hover:bg-mint"><input type="radio" name={`${active}_${question.id}`} checked={answers[active][question.id]===option.score} onChange={()=>answer(active,question.id,option.score)}/><span>{option.label}</span></label>)}</div>
      </fieldset>)}
    </div>
    {result.completed?<p className="mt-4 rounded-xl bg-mint p-4 text-sm leading-6 text-forest"><b>{result.levelLabel} :</b> {result.interpretation}</p>:<p className="mt-4 rounded-xl bg-orange/10 p-3 text-sm font-bold text-orange">{tx(`Complétez les ${assessmentQuestions[active].length} questions pour valider ce score.`,`Complete all ${assessmentQuestions[active].length} questions to validate this score.`)}</p>}
    <input type="hidden" name="wellness_assessment" value={JSON.stringify(bundle)}/>
  </section>;
}
