// @ts-nocheck -- Dynamic Supabase rows are normalized before writes.
"use client";

import { FormEvent, useMemo, useState } from "react";
import GeoFields from "@/components/accounts/GeoFields";
import { createClient } from "@/lib/supabase/client";
import {formatUsd,xofToUsd} from "@/lib/currency";

type Row = Record<string, any>;

function formPayload(form: HTMLFormElement) {
  const payload = Object.fromEntries(new FormData(form));
  for (const [key, value] of Object.entries(payload)) if (value === "") payload[key] = null;
  if (payload.city === "__other") payload.city = payload.other_city;
  return payload;
}

export default function ChildGrowthCenter({ parentId, initialChildren, initialMeasurements, subscriptions, plan, taxRate, initialAnalyses, initialAlerts, initialReports }: { parentId: string; initialChildren: Row[]; initialMeasurements: Row[]; subscriptions: Row[]; plan: Row | null; taxRate: number; initialAnalyses:Row[]; initialAlerts:Row[]; initialReports:Row[] }) {
  const [children, setChildren] = useState(initialChildren);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [selected, setSelected] = useState(initialChildren[0]?.id || "");
  const [provider, setProvider] = useState<"cinetpay" | "paypal">("cinetpay");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyses,setAnalyses]=useState(initialAnalyses),[alerts,setAlerts]=useState(initialAlerts),[reports,setReports]=useState(initialReports);
  const child = children.find(item => item.id === selected);
  const rows = useMemo(() => measurements.filter(item => item.child_id === selected).sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at)), [measurements, selected]);
  const subscription = subscriptions.find(item => item.child_id === selected && item.status === "active");

  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = formPayload(form);
    payload.currently_breastfed = payload.currently_breastfed === "true";
    payload.premature_birth = payload.premature_birth === "true";
    const { data, error } = await createClient().from("children").insert({ ...payload, parent_id: parentId }).select().single();
    if (error) setMessage(error.message);
    else { setChildren([...children, data]); setSelected(data.id); form.reset(); setMessage("Enfant ajoute. Vous pouvez maintenant activer son abonnement."); }
  }

  async function addMeasure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = formPayload(form);
    payload.edema = payload.edema === "true";
    payload.vaccinations_up_to_date = payload.vaccinations_up_to_date === "true" ? true : payload.vaccinations_up_to_date === "false" ? false : null;
    const { data, error } = await createClient().from("child_growth_measurements").insert({ ...payload, child_id: selected, recorded_by: parentId }).select().single();
    if (error) setMessage(error.message);
    else { setMeasurements([...measurements, data]); form.reset(); setMessage("Mesure enregistree. Analyse en cours..."); await analyzeNow(); }
  }

  async function checkout() {
    if (!plan || !selected) return;
    setLoading(true);
    const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id, provider, child_id: selected }) });
    const result = await response.json();
    if (response.ok && result.url) location.href = result.url; else setMessage(result.message || "Paiement indisponible.");
    setLoading(false);
  }

  async function analyzeNow(){if(!selected)return;setLoading(true);const response=await fetch('/api/child-growth/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({child_id:selected})}),result=await response.json();if(response.ok){setAnalyses([result,...analyses]);setAlerts([...(result.alerts||[]),...alerts]);setMessage('Analyse de croissance actualisee.')}else setMessage(result.message||'Analyse impossible.');setLoading(false)}
  async function createReport(){if(!selected)return;setLoading(true);const response=await fetch('/api/child-growth/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({child_id:selected})}),result=await response.json();if(response.ok){setReports([result,...reports]);setMessage('Rapport PDF genere.')}else setMessage(result.message||'Rapport impossible.');setLoading(false)}
  async function openReport(path:string){const {data,error}=await createClient().storage.from('document-vault').createSignedUrl(path,180);if(error)setMessage(error.message);else window.open(data.signedUrl,'_blank')}

  const analysis = analyze(rows);
  const savedAnalysis=analyses.find(item=>item.child_id===selected),childAlerts=alerts.filter(item=>item.child_id===selected),childReports=reports.filter(item=>item.child_id===selected);
  const ht = Number(plan?.price_excluding_tax || 10000);
  const tax = Math.round(ht * taxRate) / 100;

  return <div className="grid gap-7">
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">Ajouter un enfant</h2>
      <form onSubmit={addChild} className="mt-5 grid gap-4 md:grid-cols-3">
        <Field name="full_name" label="Nom de l'enfant" required />
        <Select name="sex" label="Sexe" options={[["female", "Fille"], ["male", "Garcon"], ["other", "Autre"]]} />
        <Field name="birth_date" label="Date de naissance" type="date" required />
        <div className="md:col-span-3"><GeoFields /></div>
        <Field name="guardian_name" label="Parent ou tuteur" required />
        <Field name="guardian_relationship" label="Lien avec l'enfant" required />
        <Select name="feeding_mode" label="Mode d'alimentation" options={[["breastfeeding", "Allaitement"], ["mixed", "Mixte"], ["formula", "Lait artificiel"], ["family_food", "Alimentation familiale"], ["other", "Autre"]]} />
        <Select name="currently_breastfed" label="Allaitement actuel" options={[["true", "Oui"], ["false", "Non"]]} />
        <Select name="premature_birth" label="Naissance prematuree" options={[["false", "Non"], ["true", "Oui"]]} />
        <Field name="birth_weight_kg" label="Poids de naissance (kg)" type="number" step="0.01" />
        <Field name="birth_length_cm" label="Taille de naissance (cm)" type="number" step="0.1" />
        <Area name="medical_history" label="Antecedents medicaux pertinents" />
        <Area name="allergies" label="Allergies" />
        <button className="btn-primary self-end md:col-span-3 md:justify-self-start">Ajouter l'enfant</button>
      </form>
    </section>

    {children.length > 0 && <>
      <section className="flex flex-wrap gap-3">{children.map(item => <button key={item.id} onClick={() => setSelected(item.id)} className={`rounded-full px-5 py-3 font-bold ${selected === item.id ? "bg-forest text-white" : "bg-white"}`}>{item.full_name}</button>)}</section>
      {child && !subscription && <section className="rounded-2xl border-2 border-orange bg-white p-6">
        <h2 className="text-2xl font-black">Activer le suivi de {child.full_name}</h2>
        <div className="mt-4 grid gap-2 text-sm sm:max-w-md"><Line label="Prix HT" value={formatUsd(xofToUsd(ht))}/><Line label={`Taxe (${taxRate} %)`} value={formatUsd(xofToUsd(tax))}/><Line label="Total TTC" value={formatUsd(xofToUsd(ht+tax))} strong/><Line label="Durée" value="12 mois"/><Line label="Renouvellement" value="Annuel"/></div>
        <div className="mt-5 flex gap-2"><ProviderButton active={provider === "cinetpay"} onClick={() => setProvider("cinetpay")}>CinetPay</ProviderButton><ProviderButton active={provider === "paypal"} onClick={() => setProvider("paypal")}>PayPal</ProviderButton></div>
        <button onClick={checkout} disabled={loading} className="btn-primary mt-5">{loading ? "Redirection..." : "Payer pour cet enfant"}</button>
      </section>}
      {child && subscription && <>
        <section className="rounded-2xl bg-mint p-5"><b>Suivi actif pour {child.full_name}</b><p className="mt-1 text-sm">Du {new Date(subscription.started_at).toLocaleDateString("fr-FR")} au {new Date(subscription.expires_at).toLocaleDateString("fr-FR")}</p></section>
        <form onSubmit={addMeasure} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
          <h2 className="text-xl font-black md:col-span-3">Nouvelle mesure</h2>
          <Field name="measured_at" label="Date de mesure" type="datetime-local" required />
          <Field name="weight_kg" label="Poids (kg)" type="number" step="0.01" />
          <Field name="height_cm" label="Taille / longueur (cm)" type="number" step="0.1" />
          <Field name="head_circumference_cm" label="Perimetre cranien (cm)" type="number" step="0.1" />
          <Field name="muac_cm" label="PB / MUAC (cm)" type="number" step="0.1" />
          <Select name="edema" label="Oedemes nutritionnels" options={[["false", "Non"], ["true", "Oui"]]} />
          <Select name="appetite" label="Appetit" options={[["good", "Bon"], ["reduced", "Diminue"], ["poor", "Faible"], ["unknown", "Non evalue"]]} />
          <Select name="breastfeeding_status" label="Statut d'allaitement" options={[["current", "En cours"], ["stopped", "Arrete"], ["not_applicable", "Non applicable"]]} />
          <Select name="vaccinations_up_to_date" label="Vaccination a jour" options={[["true", "Oui"], ["false", "Non"], ["", "Non renseigne"]]} />
          <Area name="complementary_feeding" label="Alimentation complementaire" />
          <Area name="recent_illnesses" label="Maladies recentes" />
          <Area name="notes" label="Commentaires" />
          <button className="btn-primary justify-self-start md:col-span-3">Enregistrer</button>
        </form>
        <div className="flex flex-wrap gap-3"><button onClick={analyzeNow} disabled={loading} className="btn-primary">{loading?'Traitement...':'Actualiser l analyse'}</button><button onClick={createReport} disabled={loading} className="btn-secondary">Generer le rapport PDF</button></div>
        <GrowthCharts rows={rows} />
        <MeasurementHistory rows={rows} />
        <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Analyse IA explicable</h2><p className="mt-4 leading-7">{savedAnalysis?.summary||analysis.summary}</p>{(savedAnalysis?.positives||[]).map((item:string)=><p key={item} className="mt-2 text-sm text-leaf">+ {item}</p>)}{(savedAnalysis?.attention_points||[]).map((item:string)=><p key={item} className="mt-2 text-sm text-orange">! {item}</p>)}<p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{analysis.advice}</p></section>
        <AlertPanel alerts={childAlerts}/>
        <AdvicePanel items={savedAnalysis?.parent_advice||[]}/>
        <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Rapports de croissance</h2><div className="mt-4 grid gap-3">{childReports.map(item=><button key={item.id} onClick={()=>openReport(item.file_path)} className="flex justify-between rounded-xl bg-slate-50 p-4 text-left font-bold"><span>{item.title}</span><span className="text-leaf">Telecharger</span></button>)}{!childReports.length&&<p className="text-slate-400">Aucun rapport genere.</p>}</div></section>
      </>}
    </>}
  </div>;
}

function Field({ name, label, type = "text", step, required = false }: any) { return <label className="grid gap-2 text-sm font-bold">{label}<input name={name} type={type} step={step} required={required} className="admin-input" /></label>; }
function Area({ name, label }: { name: string; label: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<textarea name={name} className="admin-input min-h-24" /></label>; }
function Select({ name, label, options }: { name: string; label: string; options: string[][] }) { return <label className="grid gap-2 text-sm font-bold">{label}<select name={name} required className="admin-input">{options.map(([value, text]) => <option key={value || "empty"} value={value}>{text}</option>)}</select></label>; }
function ProviderButton({ active, onClick, children }: any) { return <button type="button" onClick={onClick} className={`rounded-full px-4 py-2 ${active ? "bg-forest text-white" : "bg-slate-100"}`}>{children}</button>; }
function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between ${strong ? "border-t pt-2 text-lg" : ""}`}><span>{label}</span><b>{value}</b></div>; }

function analyze(rows: Row[]) {
  if (rows.length < 2) return { summary: "Ajoutez au moins deux mesures pour visualiser une tendance.", advice: "Les z-scores sont calcules uniquement apres import des tables OMS officielles adaptees a l'age et au sexe." };
  const first = rows[0], last = rows.at(-1)!;
  const months = Math.max(0.1, (+new Date(last.measured_at) - +new Date(first.measured_at)) / 2629800000);
  const weightChange = Number(last.weight_kg || 0) - Number(first.weight_kg || 0);
  const heightChange = Number(last.height_cm || 0) - Number(first.height_cm || 0);
  return { summary: `Sur ${months.toFixed(1)} mois, le poids a varie de ${weightChange.toFixed(2)} kg et la taille de ${heightChange.toFixed(1)} cm.`, advice: last.interpretation || (last.edema ? "Des oedemes ont ete signales. Contactez rapidement un professionnel de sante." : "Poursuivez des mesures regulieres et faites evaluer toute stagnation ou perte de poids.") };
}

function MeasurementHistory({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  const last = [...rows].reverse();
  return <section className="overflow-x-auto rounded-2xl border bg-white"><div className="p-5"><h2 className="text-xl font-black">Historique anthropometrique</h2><p className="mt-1 text-xs text-slate-500">Les valeurs z-score apparaissent apres import des references OMS.</p></div><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-y bg-slate-50">{["Date", "Age", "Poids", "Taille", "IMC", "P/A", "T/A", "P/T", "IMC/A", "PC/A", "MUAC", "Risque"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{last.map(row => <tr key={row.id} className="border-b"><td className="p-3">{new Date(row.measured_at).toLocaleDateString("fr-FR")}</td><td className="p-3">{value(row.age_months, " mois")}</td><td className="p-3">{value(row.weight_kg, " kg")}</td><td className="p-3">{value(row.height_cm, " cm")}</td><td className="p-3">{value(row.bmi)}</td><td className="p-3">{z(row.weight_for_age_z)}</td><td className="p-3">{z(row.height_for_age_z)}</td><td className="p-3">{z(row.weight_for_height_z)}</td><td className="p-3">{z(row.bmi_for_age_z)}</td><td className="p-3">{z(row.head_circumference_for_age_z)}</td><td className="p-3">{value(row.muac_cm, " cm")}</td><td className="p-3"><Risk value={row.risk_category} /></td></tr>)}</tbody></table></section>;
}
function value(input: any, suffix = "") { return input === null || input === undefined ? "-" : `${Number(input).toFixed(1)}${suffix}`; }
function z(input: any) { return input === null || input === undefined ? "En attente" : Number(input).toFixed(2); }
function Risk({ value }: { value: string }) { const styles: Record<string, string> = { high: "bg-red-100 text-red-800", moderate: "bg-amber-100 text-amber-800", usual: "bg-mint text-forest", unclassified: "bg-slate-100 text-slate-600" }; return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[value] || styles.unclassified}`}>{value || "non classe"}</span>; }

const chartMetrics={weightAge:{label:"Poids-age",x:"age_months",y:"weight_kg",unit:"kg"},heightAge:{label:"Taille-age",x:"age_months",y:"height_cm",unit:"cm"},weightHeight:{label:"Poids-taille",x:"height_cm",y:"weight_kg",unit:"kg"},bmiAge:{label:"IMC-age",x:"age_months",y:"bmi",unit:""},headAge:{label:"Perimetre cranien-age",x:"age_months",y:"head_circumference_cm",unit:"cm"},muacAge:{label:"MUAC-age",x:"age_months",y:"muac_cm",unit:"cm"}} as const;
function GrowthCharts({rows}:{rows:Row[]}){const [metric,setMetric]=useState<keyof typeof chartMetrics>('weightAge'),config=chartMetrics[metric],valid=rows.filter(item=>Number.isFinite(Number(item[config.x]))&&Number.isFinite(Number(item[config.y])));if(!rows.length)return null;const width=760,height=300,pad=45,xValues=valid.map(item=>Number(item[config.x])),yValues=valid.map(item=>Number(item[config.y])),xmin=Math.min(...xValues,0),xmax=Math.max(...xValues,1),ymin=Math.min(...yValues,0),ymax=Math.max(...yValues,1),xspan=xmax-xmin||1,yspan=ymax-ymin||1,x=(value:number)=>pad+(value-xmin)/xspan*(width-pad*2),y=(value:number)=>height-pad-(value-ymin)/yspan*(height-pad*2),path=valid.map((item,index)=>`${index?'L':'M'}${x(Number(item[config.x]))},${y(Number(item[config.y]))}`).join(' '),latest=valid.at(-1);return <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Graphiques de croissance</h2><p className="text-xs text-slate-500">Selectionnez un indicateur et survolez un point pour voir sa mesure.</p></div><select value={metric} onChange={event=>setMetric(event.target.value as keyof typeof chartMetrics)} className="admin-input max-w-64">{Object.entries(chartMetrics).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></div>{valid.length?<><svg viewBox={`0 0 ${width} ${height}`} className="mt-5 w-full"><line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="#cbd5e1"/><line x1={pad} y1={pad} x2={pad} y2={height-pad} stroke="#cbd5e1"/><path d={path} fill="none" stroke="#18794e" strokeWidth="4"/>{valid.map(item=><circle key={item.id} cx={x(Number(item[config.x]))} cy={y(Number(item[config.y]))} r="6" fill="white" stroke={item.risk_category==='high'?'#dc2626':item.risk_category==='moderate'?'#f28c28':'#18794e'} strokeWidth="4"><title>{`${new Date(item.measured_at).toLocaleDateString('fr-FR')}: ${Number(item[config.y]).toFixed(1)} ${config.unit}`}</title></circle>)}</svg><p className={`rounded-xl p-4 text-sm ${latest?.risk_category==='high'?'bg-red-50 text-red-800':latest?.risk_category==='moderate'?'bg-amber-50 text-amber-900':'bg-mint text-forest'}`}>{latest?.interpretation||'Evolution personnelle visible. Les comparaisons OMS exigent les references officielles.'}</p></>:<p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-500">Donnees insuffisantes pour cette courbe.</p>}</section>}
function AlertPanel({alerts}:{alerts:Row[]}){return <section><h2 className="mb-4 text-2xl font-black">Alertes enfant</h2><div className="grid gap-3">{alerts.map(alert=><article key={alert.id} className={`rounded-2xl border-l-4 bg-white p-5 ${alert.severity==='critical'?'border-red-500':alert.severity==='warning'?'border-orange':'border-sky-500'}`}><div className="flex justify-between gap-4"><b>{alert.title}</b><span className="text-xs font-bold uppercase text-slate-400">{alert.severity}</span></div><p className="mt-2 text-sm text-slate-600">{alert.message}</p>{alert.email_sent_at&&<p className="mt-2 text-xs text-slate-400">Notification email envoyee.</p>}</article>)}{!alerts.length&&<p className="rounded-2xl bg-white p-6 text-slate-400">Aucune alerte enregistree.</p>}</div></section>}
function AdvicePanel({items}:{items:Row[]}){return <section><h2 className="mb-4 text-2xl font-black">Conseils personnalises aux parents</h2><div className="grid gap-4 md:grid-cols-2">{items.map((item,index)=><article key={`${item.category}-${index}`} className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-leaf">{item.category}</p><h3 className="mt-2 font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></article>)}{!items.length&&<p className="rounded-2xl bg-white p-6 text-slate-400 md:col-span-2">Actualisez l analyse pour obtenir des conseils adaptes.</p>}</div></section>}
