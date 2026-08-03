"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { useState } from "react";

type Plan={id:string;name:string;name_en?:string;price_excluding_tax?:number;amount?:number;currency?:string;service_type:string;tier:string;features?:string[]};
type Access={health?:boolean;childGrowth?:boolean}|null;

const featureSets={
 health_tracking:{
  basic:{fr:["Tableau de bord personnel","Graphiques de tendances","Questionnaires santé","Rapports personnalisés"],en:["Personal dashboard","Trend charts","Health questionnaires","Personalized reports"]},
  premium:{fr:["Toutes les fonctions Standard","Analyses IA avancées","Rapports enrichis","Rappels et recommandations"],en:["All Standard features","Advanced AI analysis","Enhanced reports","Reminders and recommendations"]}
 },
 child_growth:{
  basic:{fr:["Dossier privé par enfant","Courbes de croissance OMS","Historique des mesures","Conseils adaptés"],en:["Private record for each child","WHO growth charts","Measurement history","Tailored guidance"]},
  premium:{fr:["Toutes les fonctions Standard","Analyses avancées","Rapports enrichis","Ressources Premium"],en:["All Standard features","Advanced analysis","Enhanced reports","Premium resources"]}
 }
} as const;

export default function HealthOfferCards({plans,english,userConnected,access}:{plans:Plan[];english:boolean;userConnected:boolean;access:Access}){
 const [selected,setSelected]=useState<Plan|null>(null);
 const t=(fr:string,en:string)=>english?en:fr;
 const active=(plan:Plan)=>plan.service_type==="child_growth"?access?.childGrowth:access?.health;
 const destination=(plan:Plan)=>{
  if(active(plan)) return `/api/access/open?service=${plan.service_type==="child_growth"?"child_growth":"health"}&role=client`;
  const checkout=`/checkout?type=subscription&id=${plan.id}`;
  return userConnected?checkout:`/connexion?redirect=${encodeURIComponent(checkout)}`;
 };
 const ordered=[...plans].sort((a,b)=>{
  const service=(a.service_type==="child_growth"?0:1)-(b.service_type==="child_growth"?0:1);
  if(service) return service;
  return (String(a.tier).toLowerCase()==="premium"?1:0)-(String(b.tier).toLowerCase()==="premium"?1:0);
 });
 return <>
  <div className="mx-auto mt-10 grid max-w-7xl items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
   {ordered.map(plan=>{
    const isActive=Boolean(active(plan));
    const premium=String(plan.tier).toLowerCase()==="premium";
    const child=plan.service_type==="child_growth";
    const serviceKey=child?"child_growth":"health_tracking";
    const tierKey=premium?"premium":"basic";
    const features=featureSets[serviceKey][tierKey][english?"en":"fr"];
    return <article key={plan.id} className={`flex min-h-[480px] flex-col rounded-[1.75rem] border bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-xl ${premium?"border-orange/40":"border-slate-200"}`}>
     <div className="flex items-center justify-between gap-3"><p className={`text-xs font-black uppercase tracking-[.16em] ${premium?"text-orange":"text-leaf"}`}>{premium?"Premium":"Standard"}</p><span className={`rounded-full px-3 py-1 text-xs font-black ${isActive?"bg-emerald-100 text-emerald-800":"bg-slate-100 text-slate-600"}`}>{isActive?t("Actif","Active"):t("Disponible","Available")}</span></div>
     <h3 className="mt-5 text-[1.35rem] font-black leading-7">{english&&plan.name_en?plan.name_en:plan.name}</h3>
     <p className="mt-4 text-sm leading-6 text-slate-600">{child?t("Un dossier strictement séparé pour chaque enfant, avec courbes et analyses adaptées.","A strictly separate record for each child, with charts and tailored analysis."):premium?t("Des analyses avancées et un accompagnement numérique renforcé.","Advanced analysis and stronger digital guidance."):t("Mesures, tendances, questionnaires et rapports personnalisés.","Measurements, trends, questionnaires and personalized reports.")}</p>
     <ul className="mt-6 grid gap-3 text-sm">{features.map(feature=><li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf"/><span>{feature}</span></li>)}</ul>
     <button type="button" onClick={()=>isActive?location.assign(destination(plan)):setSelected(plan)} className={`${premium?"bg-orange":"bg-leaf"} mt-auto inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-black text-white transition hover:brightness-95`}>{isActive?t("Ouvrir le service","Open service"):t("Activer le service","Activate service")}</button>
    </article>
   })}
  </div>
  {selected&&<div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" onMouseDown={()=>setSelected(null)}><section className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl" onMouseDown={event=>event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-orange">{String(selected.tier).toLowerCase()==="premium"?"Premium":"Standard"}</p><h2 className="mt-2 text-3xl font-black">{english&&selected.name_en?selected.name_en:selected.name}</h2></div><button type="button" onClick={()=>setSelected(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100" aria-label={t("Fermer","Close")}><X className="h-5 w-5"/></button></div><p className="mt-6 text-sm text-slate-500">{t("Montant du service","Service price")}</p><p className="mt-1 text-4xl font-black text-orange">{Number(selected.price_excluding_tax??selected.amount??0).toLocaleString(english?"en-US":"fr-FR")} {selected.currency||"XOF"}</p><p className="mt-4 rounded-2xl bg-mint p-4 text-sm leading-6 text-forest">{userConnected?t("Votre compte actuel sera utilisé pour cette activation. Aucun nouveau compte ne sera créé.","Your existing account will be used. No new account will be created."):t("Connectez-vous ou créez votre compte pour poursuivre l’achat.","Sign in or create an account to continue your purchase.")}</p><div className="mt-7 flex flex-wrap gap-3"><Link href={destination(selected)} className="btn-primary">{userConnected?t("Continuer vers l’achat","Continue to purchase"):t("Se connecter et continuer","Sign in and continue")}</Link><button type="button" onClick={()=>setSelected(null)} className="btn-secondary">{t("Annuler","Cancel")}</button></div></section></div>}
 </>;
}
