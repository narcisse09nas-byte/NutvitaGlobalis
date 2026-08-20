import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import type { nutritionPrograms } from "@/data/nutrition-programs";
import { programmeStandards } from "@/data/nutrition-programs";

type Program=(typeof nutritionPrograms)[number];
export default function NutritionProgramPage({program,en,managed}:{program:Program;en:boolean;managed?:any}){
 const sections=(managed?.sections||[]) as Array<{title?:string;text?:string;items?:string[]}>;
 const title=managed?.title||(en?program.titleEn:program.titleFr),tagline=managed?.eyebrow||(en?program.taglineEn:program.taglineFr),description=managed?.description||(en?program.descriptionEn:program.descriptionFr);
 const features=sections[0]?.items?.length?sections[0].items:(en?program.featuresEn:program.featuresFr),benefits=sections[1]?.items?.length?sections[1].items:(en?program.benefitsEn:program.benefitsFr),standards=sections[2]?.items?.length?sections[2].items:programmeStandards[en?"en":"fr"];
 const Icon=program.icon;
 return <main className="min-h-screen bg-white text-forest" style={{"--program":program.color,"--program-soft":program.soft} as React.CSSProperties}>
  <section className="container-site py-8 md:py-12"><nav className="flex items-center gap-2 text-xs font-bold text-slate-500"><Link href="/teleconseils">{en?"Specialized programmes":"Programmes spécialisés"}</Link><ChevronRight className="h-3"/><span className="text-forest">{title}</span></nav>
   <div className="mt-8 grid min-h-[570px] items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
    <article><span className="grid h-14 w-14 place-items-center rounded-full" style={{background:program.soft,color:program.color}}><Icon className="h-7 w-7"/></span><h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] md:text-6xl">{title}</h1><h2 className="mt-4 text-xl font-black" style={{color:program.color}}>{tagline}</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">{description}</p><div className="mt-7 grid gap-3">{features.map(item=><p key={item} className="flex items-center gap-3 font-semibold text-slate-700"><CheckCircle2 className="h-5 shrink-0" style={{color:program.color}}/>{item}</p>)}</div><div className="mt-9 flex flex-wrap gap-4"><Link href="/api/consultation-entry?type=dietetic" className="inline-flex items-center rounded-full px-7 py-4 font-black text-white shadow-lg" style={{background:program.color}}>{managed?.cta_label||(en?"Start now":"Commencer maintenant")}<ArrowRight className="ml-2 h-4"/></Link><a href="#benefices" className="inline-flex items-center px-3 py-4 font-black">{managed?.secondary_cta_label||(en?"Learn more":"En savoir plus")}<ArrowRight className="ml-2 h-4"/></a></div></article>
    <ProgramDashboard program={program} en={en} heroImageUrl={managed?.hero_image_url}/>
   </div>
   <div id="benefices" className="mt-8 grid gap-3 rounded-3xl border p-5 md:grid-cols-4" style={{background:program.soft}}>{benefits.map(item=><div key={item} className="flex items-center gap-3 px-3 py-3 text-sm font-black"><ShieldCheck className="h-6 shrink-0" style={{color:program.color}}/>{item}</div>)}</div>
   <div className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-5 md:grid-cols-4">{standards.map(item=><div key={item} className="flex items-center gap-3 px-3 py-3 text-sm font-bold text-slate-600"><CheckCircle2 className="h-5 shrink-0" style={{color:program.color}}/>{item}</div>)}</div>
  </section>
 </main>
}

function ProgramDashboard({program,en,heroImageUrl}:{program:Program;en:boolean;heroImageUrl?:string}){
 const image=heroImageUrl||program.image;
 return <div className="relative min-h-[520px] overflow-hidden rounded-[2.5rem]" style={{background:`linear-gradient(135deg, ${program.soft}, #ffffff)`}}>
  {image && <img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-[56%] rounded-[2.5rem] object-cover"/>}
  <div className="relative z-10 flex h-full items-center p-5 md:p-8">
   <PhoneMockup program={program} en={en}/>
  </div>
 </div>
}

function PhoneMockup({program,en}:{program:Program;en:boolean}){
 const t=(fr:string,english:string)=>en?english:fr;
 return <div className="w-[210px] shrink-0 rounded-[2.3rem] border-[7px] border-slate-900 bg-white p-4 shadow-2xl sm:w-[230px]">
  <div className="mx-auto mb-4 h-4 w-20 rounded-full bg-slate-900"/>
  <p className="text-[11px] font-black" style={{color:program.color}}>{program.key==="infant"?t("Mon enfant","My child"):t("Mon suivi","My follow-up")}</p>
  <h3 className="mt-0.5 text-base font-black">{t("Tableau de bord","Dashboard")}</h3>
  <ProgramScreenBody program={program} en={en}/>
 </div>
}

function ProgramScreenBody({program,en}:{program:Program;en:boolean}){
 const t=(fr:string,english:string)=>en?english:fr;
 if(program.key==="pregnancy")return <>
  <MetricGrid items={[[t("Poids actuel","Current weight"),"68.5 kg"],[t("Gain total","Total gain"),"+6.2 kg"],[t("Progrès","Progress"),"76%"],[t("Statut","Status"),t("Bon","Good")]]}/>
  <MiniChart color={program.color} label={t("Évolution du poids","Weight trend")} shape="up"/>
  <ActionRows items={[t("Apports nutritionnels","Nutrition intake"),t("Conseils et rappels","Advice & reminders")]}/>
 </>;
 if(program.key==="infant")return <>
  <MetricGrid cols={3} items={[[t("Poids actuel","Current weight"),"14.0 kg"],[t("Taille","Height"),"92 cm"],["IMC","16.4"]]}/>
  <MiniChart color={program.color} label={t("Courbe de croissance (IMC)","Growth curve (BMI)")} shape="multi"/>
  <div className="mt-4">
   <p className="text-[11px] font-black text-slate-500">{t("Apports clés","Key intakes")}</p>
   <div className="mt-2 grid gap-2">{[[t("Énergie","Energy"),70],[t("Protéines","Protein"),55],[t("Fer","Iron"),40],[t("Calcium","Calcium"),60]].map(([label,value])=><ProgressLine key={label as string} label={label as string} value={value as number} color={program.color}/>)}</div>
  </div>
 </>;
 if(program.key==="metabolic")return <>
  <MetricGrid items={[[t("Glycémie","Glucose"),"1.15 g/L"],[t("Tension artérielle","Blood pressure"),"125/80 mmHg"],[t("Cholestérol total","Total cholesterol"),"1.85 g/L"],[t("Poids","Weight"),"78 kg"]]}/>
  <MiniChart color={program.color} label={t("Évolution","Trend")} shape="up"/>
  <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
   <RingGauge value={76} color={program.color}/>
   <div><p className="text-[10px] font-bold text-slate-500">{t("Score de contrôle global","Overall control score")}</p><b className="text-lg" style={{color:program.color}}>76%</b></div>
  </div>
 </>;
 return <>
  <MetricGrid items={[[t("Performance","Performance"),"87%"],[t("Récupération","Recovery"),"82%"],[t("Masse maigre","Lean mass"),"67.2 kg"],[t("Masse grasse","Fat mass"),"12.3 %"]]}/>
  <MiniChart color={program.color} label={t("Évolution des performances","Performance trend")} shape="up"/>
  <div className="mt-4">
   <p className="text-[11px] font-black text-slate-500">{t("Apports du jour","Today's intake")}</p>
   <div className="mt-2 grid gap-2">
    <ProgressLine label={t("Énergie","Energy")} value={82} color={program.color} detail="3450 kcal"/>
    <ProgressLine label={t("Protéines","Protein")} value={89} color={program.color} detail="125g / 140g"/>
    <ProgressLine label={t("Hydratation","Hydration")} value={77} color={program.color} detail="2.3L / 3.0L"/>
   </div>
  </div>
 </>;
}

function MetricGrid({items,cols=2}:{items:[string,string][];cols?:2|3}){
 return <div className={`mt-4 grid gap-2 ${cols===3?"grid-cols-3":"grid-cols-2"}`}>{items.map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-2.5"><small className="block text-[9px] font-bold text-slate-500">{label}</small><b className="mt-1 block text-sm">{value}</b></div>)}</div>;
}

function ActionRows({items}:{items:string[]}){
 return <div className="mt-4 grid gap-2">{items.map(item=><div key={item} className="flex items-center justify-between rounded-xl border p-2.5 text-[11px] font-bold"><span>{item}</span><ArrowRight className="h-3"/></div>)}</div>;
}

function ProgressLine({label,value,color,detail}:{label:string;value:number;color:string;detail?:string}){
 return <div><div className="mb-1 flex justify-between text-[10px]"><span className="text-slate-500">{label}</span><b>{detail||`${value}%`}</b></div><div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full" style={{width:`${value}%`,background:color}}/></div></div>;
}

function RingGauge({value,color}:{value:number;color:string}){
 const size=52,stroke=6,radius=(size-stroke)/2,circumference=2*Math.PI*radius,offset=circumference*(1-value/100);
 return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90"><circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}/></svg>;
}

function MiniChart({color,label,shape="up"}:{color:string;label:string;shape?:"up"|"multi"}){
 return <div className="mt-4">
  <p className="text-[11px] font-black text-slate-500">{label}</p>
  <svg viewBox="0 0 220 70" className="mt-2 h-14 w-full overflow-visible">
   <path d="M5 55H215" stroke="#e2e8f0"/>
   {shape==="up"&&<path d="M5 50 C35 46,45 55,65 40 S105 44,125 24 S165 36,215 12" fill="none" stroke={color} strokeWidth="3"/>}
   {shape==="multi"&&<>
    <path d="M5 60 C60 46,120 34,215 8" fill="none" stroke={color} strokeWidth="2.5"/>
    <path d="M5 62 C60 54,120 44,215 26" fill="none" stroke={color} strokeWidth="1.6" opacity=".55" strokeDasharray="4 3"/>
    <path d="M5 64 C60 60,120 54,215 42" fill="none" stroke={color} strokeWidth="1.6" opacity=".35" strokeDasharray="4 3"/>
   </>}
  </svg>
 </div>;
}
