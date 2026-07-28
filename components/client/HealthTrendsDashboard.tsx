"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, any>;
type Source = "anthro" | "biology" | "food" | "wellness";
type Point = { date: Date; value: number };
type Metric = { key: string; label: string; unit: string; source: Source; date: string; color: string; cardio?: boolean };
const M: Metric[] = [
  ["weight_kg","Poids","kg","anthro","measured_at","#18794e"],["height_cm","Taille","cm","anthro","measured_at","#0f766e"],["bmi","IMC","kg/m²","anthro","measured_at","#e97824"],["waist_cm","Tour de taille","cm","anthro","measured_at","#9333ea"],["hip_cm","Tour de hanches","cm","anthro","measured_at","#c026d3"],["muac_cm","Périmètre brachial","cm","anthro","measured_at","#0891b2"],["body_fat_percent","Masse grasse","%","anthro","measured_at","#db2777"],["muscle_mass_kg","Masse musculaire","kg","anthro","measured_at","#4f46e5"],
  ["glucose","Glycémie","","biology","measured_at","#2684c7"],["hba1c","HbA1c","%","biology","measured_at","#7c3aed"],["total_cholesterol","Cholestérol total","","biology","measured_at","#dc6b19"],["ldl","LDL","","biology","measured_at","#be123c"],["hdl","HDL","","biology","measured_at","#059669"],["triglycerides","Triglycérides","","biology","measured_at","#d97706"],
  ["systolic_pressure","TA systolique","mmHg","biology","measured_at","#dc2626",true],["diastolic_pressure","TA diastolique","mmHg","biology","measured_at","#2563eb",true],["pulse_bpm","Pouls","bpm","biology","measured_at","#16a34a",true],
  ["calories","Apports énergétiques","kcal","food","entry_date","#65a30d"],["nutrition_score","Score alimentation","%","wellness","assessed_at","#ea580c"],["physical_activity_score","Score activité physique","%","wellness","assessed_at","#0284c7"],["lifestyle_score","Score mode de vie","%","wellness","assessed_at","#7c3aed"],
].map(([key,label,unit,source,date,color,cardio])=>({key,label,unit,source,date,color,cardio})) as Metric[];

function points(metric: Metric, sources: Record<Source,Row[]>) {
  return sources[metric.source].map(row=>({date:new Date(row[metric.date]||row.created_at),value:Number(metric.source==="food"?row.content?.[metric.key]:row[metric.key])})).filter(p=>Number.isFinite(p.value)&&Number.isFinite(+p.date)).sort((a,b)=>+a.date-+b.date);
}

export default function HealthTrendsDashboard({anthropometry,biology,food,wellness=[]}:{anthropometry:Row[];biology:Row[];food:Row[];wellness?:Row[]}) {
  const sources=useMemo(()=>({anthro:anthropometry,biology,food,wellness}),[anthropometry,biology,food,wellness]);
  const available=useMemo(()=>M.filter(metric=>points(metric,sources).length),[sources]);
  const [selected,setSelected]=useState<string[]>([]);
  const [days,setDays]=useState(0),[from,setFrom]=useState(""),[to,setTo]=useState("");
  useEffect(()=>setSelected(old=>old.length?old.filter(key=>available.some(m=>m.key===key)):available.map(m=>m.key)),[available]);
  const range=useMemo(()=>({min:from?+new Date(from):days?Date.now()-days*86400000:-Infinity,max:to?+new Date(`${to}T23:59:59`):Date.now()}),[days,from,to]);
  const shown=available.filter(m=>selected.includes(m.key)), cardio=shown.filter(m=>m.cardio), others=shown.filter(m=>!m.cardio);
  if(!available.length)return <Empty/>;
  return <div className="grid gap-6">
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-forest">Variables affichées</h2><p className="mt-1 text-sm text-slate-500">Toutes les variables déjà renseignées sont affichées par défaut.</p></div><div className="flex gap-2"><button type="button" className="btn-secondary" onClick={()=>setSelected(available.map(m=>m.key))}>Tout afficher</button><button type="button" className="btn-secondary" onClick={()=>setSelected([])}>Tout masquer</button></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{available.map(m=><label key={m.key} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-bold ${selected.includes(m.key)?"border-forest bg-mint text-forest":"text-slate-500"}`}><input className="sr-only" type="checkbox" checked={selected.includes(m.key)} onChange={()=>setSelected(old=>old.includes(m.key)?old.filter(k=>k!==m.key):[...old,m.key])}/>{m.label}</label>)}</div>
      <div className="mt-5 flex flex-wrap gap-3 border-t pt-5"><select className="admin-input max-w-[210px]" value={days} onChange={e=>{setDays(+e.target.value);setFrom("");setTo("")}}><option value="0">Toutes les données</option><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">3 mois</option><option value="180">6 mois</option><option value="365">1 an</option></select><label className="grid gap-1 text-xs font-bold text-slate-500">Du<input type="date" className="admin-input" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="grid gap-1 text-xs font-bold text-slate-500">Au<input type="date" className="admin-input" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    </section>
    {!shown.length&&<div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Sélectionnez au moins une variable.</div>}
    {!!cardio.length&&<Chart title="Tension artérielle et pouls" metrics={cardio} sources={sources} range={range}/>}
    <div className="grid gap-6 xl:grid-cols-2">{others.map(m=><Chart key={m.key} title={m.label} metrics={[m]} sources={sources} range={range}/>)}</div>
  </div>;
}

function Chart({title,metrics,sources,range}:{title:string;metrics:Metric[];sources:Record<Source,Row[]>;range:{min:number;max:number}}){
  const series=metrics.map(metric=>({metric,points:points(metric,sources).filter(p=>+p.date>=range.min&&+p.date<=range.max)})).filter(s=>s.points.length);
  if(!series.length)return <section className="rounded-3xl border bg-white p-6"><h2 className="text-xl font-black text-forest">{title}</h2><p className="mt-8 text-center text-slate-400">Aucune donnée pour cette période.</p></section>;
  const all=series.flatMap(s=>s.points), vals=all.map(p=>p.value), dates=all.map(p=>+p.date), lo=Math.min(...vals), hi=Math.max(...vals), span=hi-lo||Math.max(1,Math.abs(hi)*.1), d0=Math.min(...dates),d1=Math.max(...dates),ds=d1-d0||1,w=820,h=340,l=58,r=25,t=30,b=48,x=(d:Date)=>l+(+d-d0)/ds*(w-l-r),y=(v:number)=>h-b-(v-lo)/span*(h-t-b);
  return <section className="min-w-0 rounded-3xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-black text-forest">{title}</h2><div className="flex flex-wrap gap-3">{series.map(({metric})=><span key={metric.key} className="flex items-center gap-2 text-xs font-bold text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{background:metric.color}}/>{metric.label} {metric.unit&&`(${metric.unit})`}</span>)}</div></div><div className="mt-4 overflow-x-auto"><svg viewBox={`0 0 ${w} ${h}`} className="min-w-[620px] w-full" role="img" aria-label={title}>{[0,.25,.5,.75,1].map(s=>{const v=lo+span*s,py=y(v);return <g key={s}><line x1={l} y1={py} x2={w-r} y2={py} stroke="#e2e8f0"/><text x={l-8} y={py+4} textAnchor="end" fontSize="11" fill="#64748b">{v.toFixed(span<10?1:0)}</text></g>})}{series.map(({metric,points:ps})=><g key={metric.key}><path d={ps.map((p,i)=>`${i?"L":"M"}${x(p.date)},${y(p.value)}`).join(" ")} fill="none" stroke={metric.color} strokeWidth="4" strokeLinecap="round"/>{ps.map((p,i)=><circle key={i} cx={x(p.date)} cy={y(p.value)} r="5" fill="white" stroke={metric.color} strokeWidth="3"><title>{`${metric.label} · ${p.date.toLocaleDateString("fr-FR")} : ${p.value} ${metric.unit}`}</title></circle>)}</g>)}<text x={l} y={h-16} fontSize="11" fill="#64748b">{new Date(d0).toLocaleDateString("fr-FR")}</text><text x={w-r} y={h-16} textAnchor="end" fontSize="11" fill="#64748b">{new Date(d1).toLocaleDateString("fr-FR")}</text></svg></div></section>
}
function Empty(){return <div className="rounded-3xl border bg-white p-12 text-center"><h2 className="text-xl font-black text-forest">Aucune tendance disponible</h2><p className="mt-2 text-slate-500">Enregistrez d’abord vos paramètres de santé.</p></div>}
