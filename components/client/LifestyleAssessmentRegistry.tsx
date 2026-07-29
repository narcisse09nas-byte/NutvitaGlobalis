"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WellnessQuestionnaires from "@/components/health/WellnessQuestionnairesV2";
import { assessmentQuestions, buildAssessmentSnapshot, scoreToLegacyLevel, type AssessmentKind } from "@/lib/wellness-assessments-v2";

type Row = Record<string, any>;
const today=()=>new Date().toLocaleDateString("en-CA");

export default function LifestyleAssessmentRegistry({clientId,initialRows,locale}:{clientId:string;initialRows:Row[];locale:"fr"|"en"}){
  const [rows,setRows]=useState(initialRows);
  const [editing,setEditing]=useState<Row|null>(null);
  const [message,setMessage]=useState("");
  const tx=(fr:string,en:string)=>locale==="en"?en:fr;

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget,payload=Object.fromEntries(new FormData(form));
    let bundle:any;
    try{bundle=JSON.parse(String(payload.wellness_assessment||"{}"))}catch{return setMessage(tx("Questionnaire invalide.","Invalid questionnaire."))}
    if(!bundle.nutrition?.completed||!bundle.activity?.completed||!bundle.lifestyle?.completed)return setMessage(tx("Complétez les trois questionnaires.","Complete all three questionnaires."));
    const prioritySignals=(["nutrition","activity","lifestyle"] as AssessmentKind[]).flatMap(domain=>(bundle[domain].keySignals||[]).map((item:Row)=>({...item,domain}))).slice(0,30);
    const scoreLevels=Object.fromEntries((["nutrition","activity","lifestyle"] as AssessmentKind[]).map(domain=>[domain,{level:bundle[domain].level,label:bundle[domain].levelLabel,interpretation:bundle[domain].interpretation}]));
    const record={client_id:clientId,assessment_date:payload.assessment_date,activity_level:scoreToLegacyLevel(bundle.activity.score),diet_level:scoreToLegacyLevel(bundle.nutrition.score),nutrition_score:bundle.nutrition.score,physical_activity_score:bundle.activity.score,lifestyle_score:bundle.lifestyle.score,score_levels:scoreLevels,priority_signals:prioritySignals,questionnaire_answers:bundle.answers,questionnaire_snapshot:buildAssessmentSnapshot(bundle.answers),questionnaire_version:"nutvita-wellness-v2",notes:String(payload.notes||"")||null,recorded_by:clientId};
    const query=editing?createClient().from("health_lifestyle_assessments").update(record).eq("id",editing.id).eq("client_id",clientId):createClient().from("health_lifestyle_assessments").upsert(record,{onConflict:"client_id,assessment_date"});
    const {data,error}=await query.select().single();
    if(error)return setMessage(error.message);
    setRows(editing?rows.map(row=>row.id===data.id?data:row):[data,...rows.filter(row=>row.id!==data.id)]);
    setEditing(null); form.reset(); setMessage(tx("Évaluation enregistrée.","Assessment saved."));
  }
  async function remove(row:Row){
    if(!confirm(tx("Supprimer définitivement cette évaluation ?","Permanently delete this assessment?")))return;
    const {error}=await createClient().from("health_lifestyle_assessments").delete().eq("id",row.id).eq("client_id",clientId);
    if(error)return setMessage(error.message);
    setRows(rows.filter(item=>item.id!==row.id));if(editing?.id===row.id)setEditing(null);setMessage(tx("Évaluation supprimée.","Assessment deleted."));
  }
  return <div className="grid gap-6">
    {message&&<p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <form key={editing?.id||"new"} onSubmit={save} className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><label className="grid max-w-sm gap-2 text-sm font-bold">{tx("Date de l’évaluation","Assessment date")}<input name="assessment_date" type="date" defaultValue={editing?.assessment_date||today()} max={today()} required className="admin-input"/></label>{editing&&<button type="button" className="btn-secondary" onClick={()=>setEditing(null)}>{tx("Annuler la modification","Cancel editing")}</button>}</div>
      <WellnessQuestionnaires locale={locale} initialAnswers={editing?.questionnaire_answers}/>
      <label className="grid gap-2 rounded-2xl border bg-white p-5 text-sm font-bold">{tx("Observations facultatives","Optional observations")}<textarea name="notes" rows={3} defaultValue={editing?.notes||""} className="admin-input"/></label>
      <button className="btn-primary justify-self-start">{editing?tx("Enregistrer les modifications","Save changes"):tx("Enregistrer l’évaluation","Save assessment")}</button>
    </form>
    <div className="grid gap-4">{rows.map(row=><article key={row.id} className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">{tx("Évaluation du","Assessment of")} {new Date(`${row.assessment_date}T12:00:00`).toLocaleDateString(locale==="en"?"en-GB":"fr-FR")}</h3><p className="mt-1 text-xs text-slate-500">{row.questionnaire_version||"legacy"}</p></div><div className="flex gap-2"><button className="btn-secondary px-4 py-2" onClick={()=>setEditing(row)}>{tx("Modifier","Edit")}</button><button className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700" onClick={()=>remove(row)}>{tx("Supprimer","Delete")}</button></div></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">{(["nutrition","activity","lifestyle"] as AssessmentKind[]).map(domain=><Score key={domain} title={domain==="nutrition"?"Nutrition":domain==="activity"?tx("Activité physique","Physical activity"):tx("Mode de vie","Lifestyle")} score={row[domain==="nutrition"?"nutrition_score":domain==="activity"?"physical_activity_score":"lifestyle_score"]} meta={row.score_levels?.[domain]}/>)}</div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">{(["nutrition","activity","lifestyle"] as AssessmentKind[]).map(domain=><section key={domain} className="rounded-2xl bg-slate-50 p-4"><h4 className="font-black text-forest">{domain==="nutrition"?"Nutrition":domain==="activity"?tx("Activité","Activity"):tx("Mode de vie","Lifestyle")}</h4><div className="mt-3 grid gap-2">{(row.questionnaire_snapshot?.[domain]||assessmentQuestions[domain].map(q=>({question:q.title,answer:null,score:null}))).map((item:Row,index:number)=><div key={`${item.id||index}`} className="border-b border-slate-200 pb-2 text-sm"><p className="font-bold">{index+1}. {item.question}</p><p className="mt-1 text-slate-600">{item.answer??tx("Réponse non enregistrée","Answer not recorded")} {item.score!=null&&<b className="text-forest">({item.score}/4)</b>}</p></div>)}</div></section>)}</div>
      {row.notes&&<p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{row.notes}</p>}
    </article>)}{!rows.length&&<p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{tx("Aucune évaluation.","No assessment.")}</p>}</div>
  </div>
}
function Score({title,score,meta}:{title:string;score?:number|null;meta?:{label?:string;interpretation?:string}}){return <section className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><h4 className="font-black text-forest">{title}</h4><b className="text-xl text-orange">{score==null?"-":`${score}%`}</b></div><p className="mt-2 font-black">{meta?.label||"-"}</p><p className="mt-2 text-xs leading-5 text-slate-600">{meta?.interpretation||"-"}</p></section>}
