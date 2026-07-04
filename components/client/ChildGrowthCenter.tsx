// @ts-nocheck -- Dynamic Supabase rows are normalized before writes.
"use client";

import { FormEvent, useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import GeoFields from "@/components/accounts/GeoFields";
import { createClient } from "@/lib/supabase/client";
import { customIndicatorTemplates } from "@/lib/tracking-indicators";
import ChildNutritionVaccination from "@/components/client/ChildNutritionVaccination";
import { calculateNutriTrackZScores, completedAgeMonths } from "@/lib/child-growth-zscores";
import { buildWhoGrowthCurve, whoCurveDefinitions, type WhoCurveKey, type WhoGrowthReference } from "@/lib/who-growth-curves";

type Row = Record<string, any>;

function formPayload(form: HTMLFormElement) {
  const payload = Object.fromEntries(new FormData(form));
  for (const [key, value] of Object.entries(payload)) if (value === "") payload[key] = null;
  if (payload.city === "__other") payload.city = payload.other_city;
  return payload;
}

export default function ChildGrowthCenter({ parentId, initialChildren, initialMeasurements, subscriptions, plan, taxRate, initialAnalyses, initialAlerts, initialReports, initialFeeding, initialVaccinations, growthStandards, locale = "fr" }: { parentId: string; initialChildren: Row[]; initialMeasurements: Row[]; subscriptions: Row[]; plan: Row | null; taxRate: number; initialAnalyses:Row[]; initialAlerts:Row[]; initialReports:Row[]; initialFeeding:Row[]; initialVaccinations:Row[]; growthStandards:WhoGrowthReference[]; locale?: "fr" | "en" }) {
  const [children, setChildren] = useState(initialChildren);
  const [activeSubscriptions,setActiveSubscriptions]=useState(subscriptions);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [selected, setSelected] = useState(initialChildren[0]?.id || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"measurement" | "assessments">("measurement");
  const [analyses,setAnalyses]=useState(initialAnalyses),[alerts,setAlerts]=useState(initialAlerts),[reports,setReports]=useState(initialReports);
  const child = children.find(item => item.id === selected);
  const tx=(fr:string,en:string)=>locale==="en"?en:fr;
  const rows = useMemo(() => measurements.filter(item => item.child_id === selected).sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at)), [measurements, selected]);
  const customTemplates = useMemo(() => customIndicatorTemplates(rows), [rows]);
  const subscription = activeSubscriptions.find(item => item.status === "active" && (item.child_id === selected || (!item.child_id && item.purchase_action === "included_pack")));
  const childSubscriptionCount = activeSubscriptions.filter(item => item.subscription_plans?.service_type === "child_growth" || String(item.plan_id).includes("child-growth")).length;

  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (children.length > 0 && children.length >= childSubscriptionCount) {
      setMessage(tx("Chaque abonnement croissance est reserve a un seul enfant. Activez un nouvel abonnement avant d ajouter un autre enfant.","Each child growth subscription is reserved for one child. Activate another subscription before adding another child."));
      return;
    }
    const form = event.currentTarget;
    const payload = formPayload(form);
    payload.currently_breastfed = payload.currently_breastfed === "true";
    payload.premature_birth = payload.premature_birth === "true";
    const { data, error } = await createClient().from("children").insert({ ...payload, parent_id: parentId }).select().single();
    if (error) setMessage(error.message);
    else { setChildren([...children, data]); setSelected(data.id); form.reset(); setMessage(tx("Enfant ajoute. Si votre suivi est deja active, vous pouvez commencer les mesures maintenant.","Child added. If monitoring is already active, you can start recording measurements.")); }
  }

  async function addMeasure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = formPayload(form);
    payload.edema = payload.edema === "true";
    if (payload.custom_values) {
      try { payload.custom_values = JSON.parse(String(payload.custom_values)); }
      catch { payload.custom_values = {}; }
    }
    const zScores = calculateNutriTrackZScores({
      birthDate: child.birth_date,
      measuredAt: String(payload.measured_at),
      sex: child.sex,
      weightKg: Number(payload.weight_kg),
      heightCm: Number(payload.height_cm),
    });
    payload.age_months = zScores.ageMonths;
    payload.weight_for_age_z = zScores.weightForAgeZ;
    payload.height_for_age_z = zScores.heightForAgeZ;
    payload.weight_for_height_z = zScores.weightForHeightZ;
    if (subscription?.purchase_action === "included_pack" && !subscription.child_id) {
      const { error: assignmentError } = await createClient().rpc("assign_included_growth_subscription",{p_subscription_id:subscription.id,p_child_id:selected});
      if (assignmentError) { setMessage(assignmentError.message); return; }
      setActiveSubscriptions(activeSubscriptions.map(item=>item.id===subscription.id?{...item,child_id:selected}:item));
    }
    const { data, error } = await createClient().from("child_growth_measurements").insert({ ...payload, child_id: selected, recorded_by: parentId }).select().single();
    if (error) setMessage(error.message);
    else { setMeasurements([...measurements, data]); form.reset(); setMessage(tx("Mesure enregistree. Analyse en cours...","Measurement saved. Analysis in progress...")); await analyzeNow(); }
  }

  async function editMeasure(row: Row) {
    const measuredAt = window.prompt(tx("Date de mesure (AAAA-MM-JJ)","Measurement date (YYYY-MM-DD)"), String(row.measured_at || "").slice(0, 10));
    if (measuredAt === null) return;
    const weight = window.prompt(tx("Poids (kg)","Weight (kg)"), row.weight_kg == null ? "" : String(row.weight_kg));
    if (weight === null) return;
    const height = window.prompt(tx("Taille (cm)","Height (cm)"), row.height_cm == null ? "" : String(row.height_cm));
    if (height === null) return;
    const nextWeight=weight===""?null:Number(weight),nextHeight=height===""?null:Number(height);
    const zScores=nextWeight&&nextHeight?calculateNutriTrackZScores({birthDate:child.birth_date,measuredAt,sex:child.sex,weightKg:nextWeight,heightCm:nextHeight}):null;
    const { data, error } = await createClient().from("child_growth_measurements").update({ measured_at: `${measuredAt}T12:00:00`, weight_kg: nextWeight, height_cm: nextHeight, age_months:zScores?.ageMonths??null, weight_for_age_z:zScores?.weightForAgeZ??null, height_for_age_z:zScores?.heightForAgeZ??null, weight_for_height_z:zScores?.weightForHeightZ??null }).eq("id", row.id).select().single();
    if (error) setMessage(error.message);
    else { setMeasurements(measurements.map(item => item.id === row.id ? data : item)); setMessage(tx("Mesure modifiee.","Measurement updated.")); }
  }

  async function deleteMeasure(id: string) {
    if (!window.confirm(tx("Supprimer definitivement cette mesure ?","Permanently delete this measurement?"))) return;
    const { error } = await createClient().from("child_growth_measurements").delete().eq("id", id);
    if (error) setMessage(error.message);
    else { setMeasurements(measurements.filter(item => item.id !== id)); setMessage(tx("Mesure supprimee.","Measurement deleted.")); }
  }

  async function checkout() {
    if (!plan || !selected) return;
    setLoading(true);
    const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id, provider: "manual_mobile_money", child_id: selected }) });
    const result = await response.json();
    if (response.ok && result.url) location.href = result.url; else setMessage(result.message || tx("Activation indisponible.","Activation unavailable."));
    setLoading(false);
  }

  async function analyzeNow(){if(!selected)return;setLoading(true);const response=await fetch('/api/child-growth/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({child_id:selected})}),result=await response.json();if(response.ok){setAnalyses([result,...analyses]);setAlerts([...(result.alerts||[]),...alerts]);setMessage(tx("Analyse de croissance actualisee.","Growth analysis updated."))}else setMessage(result.message||tx("Analyse impossible.","Analysis unavailable."));setLoading(false)}
  async function createReport(){if(!selected)return;setLoading(true);const response=await fetch('/api/child-growth/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({child_id:selected})}),result=await response.json();if(response.ok){setReports([result,...reports]);setMessage(tx("Rapport PDF genere.","PDF report generated."))}else setMessage(result.message||tx("Rapport impossible.","Report unavailable."));setLoading(false)}
  async function openReport(path:string){const {data,error}=await createClient().storage.from('document-vault').createSignedUrl(path,180);if(error)setMessage(error.message);else window.open(data.signedUrl,'_blank')}

  const analysis = analyze(rows);
  const savedAnalysis=analyses.find(item=>item.child_id===selected),childAlerts=alerts.filter(item=>item.child_id===selected),childReports=reports.filter(item=>item.child_id===selected);
  return <div className="grid gap-7">
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">{tx("Ajouter un enfant","Add a child")}</h2>
      <form onSubmit={addChild} className="mt-5 grid gap-4 md:grid-cols-3">
        <Field name="full_name" label={tx("Nom de l'enfant","Child's full name")} required />
        <Select name="sex" label={tx("Sexe","Sex")} options={[["female", tx("Fille","Girl")], ["male", tx("Garcon","Boy")], ["other", tx("Autre","Other")]]} />
        <Field name="birth_date" label={tx("Date de naissance","Date of birth")} type="date" required />
        <div className="md:col-span-3"><GeoFields locale={locale}/></div>
        <Field name="guardian_name" label={tx("Parent ou tuteur","Parent or guardian")} required />
        <Field name="guardian_relationship" label={tx("Lien avec l'enfant","Relationship to child")} required />
        <Select name="feeding_mode" label={tx("Mode d'alimentation","Feeding mode")} options={[["breastfeeding", tx("Allaitement","Breastfeeding")], ["mixed", tx("Mixte","Mixed feeding")], ["formula", tx("Lait artificiel","Formula feeding")], ["family_food", tx("Alimentation familiale","Family foods")], ["other", tx("Autre","Other")]]} />
        <Select name="currently_breastfed" label={tx("Allaitement actuel","Currently breastfed")} options={[["true", tx("Oui","Yes")], ["false", tx("Non","No")]]} />
        <Select name="premature_birth" label={tx("Naissance prematuree","Premature birth")} options={[["false", tx("Non","No")], ["true", tx("Oui","Yes")]]} />
        <Field name="birth_weight_kg" label={tx("Poids de naissance (kg)","Birth weight (kg)")} type="number" step="0.01" />
        <Field name="birth_length_cm" label={tx("Taille de naissance (cm)","Birth length (cm)")} type="number" step="0.1" />
        <Area name="medical_history" label={tx("Antecedents medicaux pertinents","Relevant medical history")} />
        <Area name="allergies" label={tx("Allergies","Allergies")} />
        <button className="btn-primary self-end md:col-span-3 md:justify-self-start">{tx("Ajouter l'enfant","Add child")}</button>
      </form>
    </section>

    {children.length > 0 && <>
      <section className="flex flex-wrap gap-3">{children.map(item => <button key={item.id} onClick={() => { setSelected(item.id); setProfileOpen(false); }} className={`rounded-full px-5 py-3 font-bold ${selected === item.id ? "bg-forest text-white" : "bg-white"}`}>{item.full_name}</button>)}</section>
      {child && <section className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase text-leaf">{tx("Enfant selectionne","Selected child")}</p><h2 className="mt-1 text-2xl font-black">{child.full_name}</h2><p className="mt-1 text-sm text-slate-500">{new Date(child.birth_date).toLocaleDateString(locale==="en"?"en-GB":"fr-FR")} - {child.sex === "female" ? tx("Fille","Girl") : child.sex === "male" ? tx("Garcon","Boy") : tx("Sexe non precise","Sex not specified")}</p></div>
          <button type="button" onClick={() => setProfileOpen(!profileOpen)} className="btn-secondary">{profileOpen ? tx("Masquer le profil","Hide profile") : tx("Voir le profil","View profile")}</button>
        </div>
        {profileOpen && <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <ProfileItem locale={locale} label={tx("Parent ou tuteur","Parent or guardian")} value={child.guardian_name}/>
          <ProfileItem locale={locale} label={tx("Lien avec l'enfant","Relationship to child")} value={child.guardian_relationship}/>
          <ProfileItem locale={locale} label={tx("Lieu","Location")} value={[child.city, child.region, child.country].filter(Boolean).join(", ")}/>
          <ProfileItem locale={locale} label={tx("Mode d'alimentation","Feeding mode")} value={child.feeding_mode}/>
          <ProfileItem locale={locale} label={tx("Allaitement actuel","Currently breastfed")} value={child.currently_breastfed ? tx("Oui","Yes") : tx("Non","No")}/>
          <ProfileItem locale={locale} label={tx("Naissance prematuree","Premature birth")} value={child.premature_birth ? tx("Oui","Yes") : tx("Non","No")}/>
          <ProfileItem locale={locale} label={tx("Poids de naissance","Birth weight")} value={child.birth_weight_kg ? `${child.birth_weight_kg} kg` : null}/>
          <ProfileItem locale={locale} label={tx("Taille de naissance","Birth length")} value={child.birth_length_cm ? `${child.birth_length_cm} cm` : null}/>
          <ProfileItem locale={locale} label={tx("Allergies","Allergies")} value={child.allergies}/>
          <div className="sm:col-span-2 lg:col-span-3"><ProfileItem locale={locale} label={tx("Antecedents medicaux","Medical history")} value={child.medical_history}/></div>
        </dl>}
      </section>}
      {child && !subscription && <section className="rounded-2xl border-2 border-orange bg-white p-6">
        <h2 className="text-2xl font-black">{tx(`Activer le suivi de ${child.full_name}`,`Activate monitoring for ${child.full_name}`)}</h2>
        <div className="mt-4 grid gap-2 text-sm sm:max-w-md"><Line label={tx("Prix actuel","Current price")} value={tx("Gratuit temporairement","Temporarily free")} strong/><Line label={tx("Duree","Duration")} value={tx("12 mois","12 months")}/><Line label={tx("Renouvellement","Renewal")} value={tx("Annuel","Annual")}/><p className="text-xs text-slate-500">{tx("Les paiements sont en stand-by pendant la finalisation juridique de l'entreprise.","Payments are paused while the company's legal setup is finalized.")}</p></div>
        <button onClick={checkout} disabled={loading} className="btn-primary mt-5">{loading ? tx("Activation...","Activating...") : tx("Activer gratuitement pour cet enfant","Activate free access for this child")}</button>
      </section>}
      {child && subscription && <>
        <section className="rounded-2xl bg-mint p-5"><b>{tx("Suivi actif pour","Monitoring active for")} {child.full_name}</b><p className="mt-1 text-sm">{tx("Du","From")} {new Date(subscription.started_at).toLocaleDateString(locale==="en"?"en-GB":"fr-FR")} {tx("au","to")} {new Date(subscription.expires_at).toLocaleDateString(locale==="en"?"en-GB":"fr-FR")}</p></section>
        <section className="grid gap-7 rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap gap-2 border-b pb-5">
          <button type="button" onClick={() => setEntryMode("measurement")} className={entryMode === "measurement" ? "btn-primary" : "btn-secondary"}>{locale === "en" ? "Measurements" : "Mesures anthropometriques"}</button>
          <button type="button" onClick={() => setEntryMode("assessments")} className={entryMode === "assessments" ? "btn-primary" : "btn-secondary"}>{locale === "en" ? "Feeding and vaccination" : "Alimentation et vaccination"}</button>
        </div>
        {entryMode === "measurement" && <form onSubmit={addMeasure} className="grid gap-4 md:grid-cols-3">
          <h2 className="text-xl font-black md:col-span-3">{locale === "en" ? "New measurement" : "Nouvelle mesure"}</h2>
          <Field name="measured_at" label={tx("Date de mesure","Measurement date")} type="datetime-local" required />
          <Field name="weight_kg" label={tx("Poids (kg)","Weight (kg)")} type="number" step="0.01" />
          <Field name="height_cm" label={tx("Taille / longueur (cm)","Height / length (cm)")} type="number" step="0.1" />
          <Select name="measurement_method" label={tx("Methode de mesure OMS","WHO measurement method")} defaultValue={(completedAgeMonths(child.birth_date,new Date().toISOString())??0)<24?"recumbent_length":"standing_height"} options={[["recumbent_length", tx("Longueur couchee","Recumbent length")], ["standing_height", tx("Taille debout","Standing height")]]} />
          <Field name="head_circumference_cm" label={tx("Perimetre cranien (cm)","Head circumference (cm)")} type="number" step="0.1" />
          <Field name="muac_cm" label={tx("PB / MUAC (cm)","MUAC (cm)")} type="number" step="0.1" />
          <Select name="edema" label={tx("Oedemes nutritionnels","Nutritional oedema")} options={[["false", tx("Non","No")], ["true", tx("Oui","Yes")]]} />
          <Select name="appetite" label={tx("Appetit","Appetite")} options={[["good", tx("Bon","Good")], ["reduced", tx("Diminue","Reduced")], ["poor", tx("Faible","Poor")], ["unknown", tx("Non evalue","Not assessed")]]} />
          <Select name="breastfeeding_status" label={tx("Statut d'allaitement","Breastfeeding status")} options={[["current", tx("En cours","Current")], ["stopped", tx("Arrete","Stopped")], ["not_applicable", tx("Non applicable","Not applicable")]]} />
          <Area name="recent_illnesses" label={tx("Maladies recentes","Recent illnesses")} />
          <ChildCustomIndicators key={selected} templates={customTemplates} locale={locale}/>
          <Area name="notes" label={tx("Commentaires","Comments")} />
          <button className="btn-primary justify-self-start md:col-span-3">{tx("Enregistrer","Save")}</button>
        </form>}
        {entryMode === "assessments" && <ChildNutritionVaccination key={child.id} child={child} userId={parentId} feeding={initialFeeding.filter(item=>item.child_id===child.id)} vaccinations={initialVaccinations.filter(item=>item.child_id===child.id)} locale={locale} embedded/>}
        </section>
        <div className="flex flex-wrap gap-3"><button onClick={analyzeNow} disabled={loading} className="btn-primary">{loading?tx("Traitement...","Processing..."):tx("Actualiser l'analyse","Update analysis")}</button><button onClick={createReport} disabled={loading} className="btn-secondary">{tx("Generer le rapport PDF","Generate PDF report")}</button></div>
        <GrowthCharts rows={rows} child={child} standards={growthStandards} locale={locale} />
        <MeasurementHistory rows={rows} onEdit={editMeasure} onDelete={deleteMeasure} locale={locale} />
        <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">{tx("Analyse IA explicable","Explainable AI analysis")}</h2><p className="mt-4 leading-7">{savedAnalysis?.summary||analysis.summary}</p>{(savedAnalysis?.positives||[]).map((item:string)=><p key={item} className="mt-2 text-sm text-leaf">+ {item}</p>)}{(savedAnalysis?.attention_points||[]).map((item:string)=><p key={item} className="mt-2 text-sm text-orange">! {item}</p>)}<p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{analysis.advice}</p>{(savedAnalysis?.indicator_insights||savedAnalysis?.indicatorInsights||[]).length>0&&<div className="mt-5 grid gap-3">{(savedAnalysis?.indicator_insights||savedAnalysis?.indicatorInsights||[]).map((item:any)=><article key={item.indicator} className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap justify-between gap-2"><b>{item.indicator}</b><span className="text-xs font-bold uppercase text-slate-500">{item.status}</span></div><p className="mt-2 text-sm text-slate-700">{item.parentInterpretation}</p><p className="mt-2 text-xs text-slate-500">{item.professionalInterpretation}</p></article>)}</div>}</section>
        <AlertPanel alerts={childAlerts} locale={locale}/>
        <AdvicePanel items={savedAnalysis?.parent_advice||[]} locale={locale}/>
        <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">{tx("Rapports de croissance","Growth reports")}</h2><div className="mt-4 grid gap-3">{childReports.map(item=><button key={item.id} onClick={()=>openReport(item.file_path)} className="flex justify-between rounded-xl bg-slate-50 p-4 text-left font-bold"><span>{item.title}</span><span className="text-leaf">{tx("Telecharger","Download")}</span></button>)}{!childReports.length&&<p className="text-slate-400">{tx("Aucun rapport genere.","No report generated.")}</p>}</div></section>
      </>}
    </>}
  </div>;
}

function Field({ name, label, type = "text", step, required = false }: any) { return <label className="grid gap-2 text-sm font-bold">{label}<input name={name} type={type} step={step} required={required} className="admin-input" /></label>; }
function Area({ name, label }: { name: string; label: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<textarea name={name} className="admin-input min-h-24" /></label>; }
function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[][]; defaultValue?:string }) { return <label className="grid gap-2 text-sm font-bold">{label}<select name={name} required defaultValue={defaultValue} className="admin-input">{options.map(([value, text]) => <option key={value || "empty"} value={value}>{text}</option>)}</select></label>; }
function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between ${strong ? "border-t pt-2 text-lg" : ""}`}><span>{label}</span><b>{value}</b></div>; }
function ProfileItem({ label, value,locale }: { label: string; value?: string | null;locale:"fr"|"en" }) { return <div><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-semibold text-slate-700">{value || (locale==="en"?"Not provided":"Non renseigne")}</dd></div>; }

function ChildCustomIndicators({templates,locale}:{templates:Array<{name:string;unit?:string;normal_min?:number|null;normal_max?:number|null}>;locale:"fr"|"en"}) {
  const [items,setItems]=useState(templates.map(item=>({name:item.name,value:"",unit:item.unit||"",normalMin:item.normal_min==null?"":String(item.normal_min),normalMax:item.normal_max==null?"":String(item.normal_max)})));
  const values=Object.fromEntries(items.filter(item=>item.name.trim()&&item.value!=="").map(item=>[item.name.trim(),{value:Number(item.value),unit:item.unit.trim(),normal_min:item.normalMin===""?null:Number(item.normalMin),normal_max:item.normalMax===""?null:Number(item.normalMax)}]));
  return <div className="rounded-2xl bg-slate-50 p-4 md:col-span-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">{locale==="en"?"Other growth or health indicators":"Autres indicateurs de croissance ou de sante"}</h3><p className="text-sm text-slate-500">{locale==="en"?"They remain available for future measurements. A normal range enables comparison.":"Ils resteront disponibles pour les prochaines mesures de cet enfant. La plage normale permet une analyse comparative."}</p></div><button type="button" className="btn-secondary px-4 py-2" onClick={()=>setItems([...items,{name:"",value:"",unit:"",normalMin:"",normalMax:""}])}><PlusIcon className="mr-2 h-4"/>{locale==="en"?"Add indicator":"Ajouter un indicateur"}</button></div>
    <div className="mt-4 grid gap-3">{items.map((item,index)=><div key={`${item.name}-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_.8fr_.7fr_.7fr_.7fr_auto]"><input className="admin-input" placeholder={locale==="en"?"Name":"Nom"} value={item.name} onChange={event=>setItems(items.map((row,i)=>i===index?{...row,name:event.target.value}:row))}/><input className="admin-input" type="number" step="0.01" placeholder={locale==="en"?"Value":"Valeur"} value={item.value} onChange={event=>setItems(items.map((row,i)=>i===index?{...row,value:event.target.value}:row))}/><input className="admin-input" placeholder={locale==="en"?"Unit":"Unite"} value={item.unit} onChange={event=>setItems(items.map((row,i)=>i===index?{...row,unit:event.target.value}:row))}/><input className="admin-input" type="number" step="0.01" placeholder={locale==="en"?"Normal min.":"Norme min."} value={item.normalMin} onChange={event=>setItems(items.map((row,i)=>i===index?{...row,normalMin:event.target.value}:row))}/><input className="admin-input" type="number" step="0.01" placeholder={locale==="en"?"Normal max.":"Norme max."} value={item.normalMax} onChange={event=>setItems(items.map((row,i)=>i===index?{...row,normalMax:event.target.value}:row))}/><button type="button" aria-label={locale==="en"?"Delete indicator":"Supprimer l'indicateur"} className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600" onClick={()=>setItems(items.filter((_,i)=>i!==index))}><TrashIcon className="h-5"/></button></div>)}</div>
    <input type="hidden" name="custom_values" value={JSON.stringify(values)}/>
  </div>;
}

function analyze(rows: Row[]) {
  if (rows.length < 2) return { summary: "Ajoutez au moins deux mesures pour visualiser une tendance.", advice: "Les z-scores P/A, T/A et P/T sont calcules automatiquement selon l age, le sexe, le poids et la taille renseignes." };
  const first = rows[0], last = rows.at(-1)!;
  const months = Math.max(0.1, (+new Date(last.measured_at) - +new Date(first.measured_at)) / 2629800000);
  const weightChange = Number(last.weight_kg || 0) - Number(first.weight_kg || 0);
  const heightChange = Number(last.height_cm || 0) - Number(first.height_cm || 0);
  return { summary: `Sur ${months.toFixed(1)} mois, le poids a varie de ${weightChange.toFixed(2)} kg et la taille de ${heightChange.toFixed(1)} cm.`, advice: last.interpretation || (last.edema ? "Des oedemes ont ete signales. Contactez rapidement un professionnel de sante." : "Poursuivez des mesures regulieres et faites evaluer toute stagnation ou perte de poids.") };
}

function MeasurementHistory({ rows, onEdit, onDelete, locale }: { rows: Row[]; onEdit: (row:Row)=>void; onDelete:(id:string)=>void; locale:"fr"|"en" }) {
  if (!rows.length) return null;
  const last = [...rows].reverse();
  const en=locale==="en";
  return <section className="overflow-x-auto rounded-2xl border bg-white"><div className="p-5"><h2 className="text-xl font-black">{en?"Anthropometric history":"Historique anthropometrique"}</h2><p className="mt-1 text-xs text-slate-500">{en?"Z-scores appear after WHO references are imported.":"Les valeurs z-score apparaissent apres import des references OMS."}</p></div><table className="w-full min-w-[1150px] text-left text-sm"><thead><tr className="border-y bg-slate-50">{(en?["Date","Age","Weight","Height","BMI","W/A","H/A","W/H","BMI/A","HC/A","MUAC","Risk","Actions"]:["Date","Age","Poids","Taille","IMC","P/A","T/A","P/T","IMC/A","PC/A","MUAC","Risque","Actions"]).map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{last.map(row => <tr key={row.id} className="border-b"><td className="p-3">{new Date(row.measured_at).toLocaleDateString(en?"en-GB":"fr-FR")}</td><td className="p-3">{value(row.age_months,en?" months":" mois")}</td><td className="p-3">{value(row.weight_kg," kg")}</td><td className="p-3">{value(row.height_cm," cm")}</td><td className="p-3">{value(row.bmi)}</td><td className="p-3">{z(row.weight_for_age_z,en)}</td><td className="p-3">{z(row.height_for_age_z,en)}</td><td className="p-3">{z(row.weight_for_height_z,en)}</td><td className="p-3">{z(row.bmi_for_age_z,en)}</td><td className="p-3">{z(row.head_circumference_for_age_z,en)}</td><td className="p-3">{value(row.muac_cm," cm")}</td><td className="p-3"><Risk value={row.risk_category} locale={locale}/></td><td className="p-3"><div className="flex gap-2"><button onClick={()=>onEdit(row)} className="rounded-lg border px-3 py-2 text-xs font-bold">{en?"Edit":"Modifier"}</button><button onClick={()=>onDelete(row.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{en?"Delete":"Supprimer"}</button></div></td></tr>)}</tbody></table></section>;
}
function value(input: any, suffix = "") { return input === null || input === undefined ? "-" : `${Number(input).toFixed(1)}${suffix}`; }
function z(input: any,en=false) { return input === null || input === undefined ? (en?"Pending":"En attente") : Number(input).toFixed(2); }
function Risk({ value,locale }: { value: string;locale:"fr"|"en" }) { const styles: Record<string, string> = { high: "bg-red-100 text-red-800", moderate: "bg-amber-100 text-amber-800", usual: "bg-mint text-forest", unclassified: "bg-slate-100 text-slate-600" },labels:Record<string,string>=locale==="en"?{high:"high",moderate:"moderate",usual:"usual",unclassified:"unclassified"}:{high:"eleve",moderate:"modere",usual:"habituel",unclassified:"non classe"}; return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[value] || styles.unclassified}`}>{labels[value]||labels.unclassified}</span>; }

const personalChartMetrics={
  bmiAge:{label:"IMC-age",xKey:"age_months",yKey:"bmi",xLabel:"Age (mois)",yLabel:"IMC"},
  headAge:{label:"Perimetre cranien-age",xKey:"age_months",yKey:"head_circumference_cm",xLabel:"Age (mois)",yLabel:"Perimetre cranien (cm)"},
  muacAge:{label:"MUAC-age",xKey:"age_months",yKey:"muac_cm",xLabel:"Age (mois)",yLabel:"PB / MUAC (cm)"},
} as const;
type GrowthMetric=WhoCurveKey|keyof typeof personalChartMetrics;

function GrowthCharts({rows,child,standards,locale}:{rows:Row[];child:Row;standards:WhoGrowthReference[];locale:"fr"|"en"}){
  const [metric,setMetric]=useState<GrowthMetric>("weightAge");
  const en=locale==="en";
  if(!rows.length)return null;
  const whoDefinition=metric in whoCurveDefinitions?whoCurveDefinitions[metric as WhoCurveKey]:null;
  const personalDefinition=metric in personalChartMetrics?personalChartMetrics[metric as keyof typeof personalChartMetrics]:null;
  const config=whoDefinition||personalDefinition!;
  const latestMethod=rows.at(-1)?.measurement_method;
  const reference=whoDefinition?buildWhoGrowthCurve(standards,metric as WhoCurveKey,child.sex,latestMethod):[];
  const valid=rows.filter(item=>Number.isFinite(Number(item[config.xKey]))&&Number.isFinite(Number(item[config.yKey])));
  const width=900,height=470,pad={left:72,right:76,top:42,bottom:62};
  const patientX=valid.map(item=>Number(item[config.xKey])),patientY=valid.map(item=>Number(item[config.yKey]));
  const referenceX=reference.map(item=>item.x),referenceY=reference.flatMap(item=>[item.sd3neg,item.sd3]);
  const allX=[...referenceX,...patientX],allY=[...referenceY,...patientY];
  if(!allX.length||!allY.length)return <section className="rounded-2xl border bg-white p-5"><p className="text-slate-500">{en?"Insufficient data for this chart.":"Donnees insuffisantes pour cette courbe."}</p></section>;
  const xMin=Math.min(...allX),xMax=Math.max(...allX),yMin=Math.min(...allY),yMax=Math.max(...allY);
  const xMargin=(xMax-xMin||1)*.02,yMargin=(yMax-yMin||1)*.08;
  const xmin=xMin-xMargin,xmax=xMax+xMargin,ymin=Math.max(0,yMin-yMargin),ymax=yMax+yMargin;
  const x=(value:number)=>pad.left+(value-xmin)/(xmax-xmin)*(width-pad.left-pad.right);
  const y=(value:number)=>height-pad.bottom-(value-ymin)/(ymax-ymin)*(height-pad.top-pad.bottom);
  const line=(key:keyof typeof reference[number])=>reference.map((item,index)=>`${index?"L":"M"}${x(item.x).toFixed(1)},${y(Number(item[key])).toFixed(1)}`).join(" ");
  const band=(upper:keyof typeof reference[number],lower:keyof typeof reference[number])=>{
    if(!reference.length)return "";
    return [...reference.map(item=>`${x(item.x).toFixed(1)},${y(Number(item[upper])).toFixed(1)}`),...reference.slice().reverse().map(item=>`${x(item.x).toFixed(1)},${y(Number(item[lower])).toFixed(1)}`)].join(" ");
  };
  const patientPath=valid.map((item,index)=>`${index?"L":"M"}${x(Number(item[config.xKey])).toFixed(1)},${y(Number(item[config.yKey])).toFixed(1)}`).join(" ");
  const ticks=Array.from({length:7},(_,index)=>({x:xmin+(xmax-xmin)*index/6,y:ymin+(ymax-ymin)*index/6}));
  const latest=valid.at(-1);
  const curves=[["sd3neg","-3 DS"],["sd2neg","-2 DS"],["sd1neg","-1 DS"],["median","Mediane"],["sd1","+1 DS"],["sd2","+2 DS"],["sd3","+3 DS"]] as const;
  return <section className="rounded-2xl border bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{en?"WHO growth charts":"Courbes de croissance OMS"}</h2><p className="text-xs text-slate-500">{en?`WHO 2006 standards for ${child.sex==="female"?"girls":"boys"}: median and standard deviations from -3 to +3 SD.`:`Standards OMS 2006 pour ${child.sex==="female"?"filles":"garcons"} : mediane et ecarts-types de -3 a +3 DS.`}</p></div><select value={metric} onChange={event=>setMetric(event.target.value as GrowthMetric)} className="admin-input max-w-72">{Object.entries(whoCurveDefinitions).map(([key,item])=><option key={key} value={key}>{item.label} - WHO</option>)}{Object.entries(personalChartMetrics).map(([key,item])=><option key={key} value={key}>{item.label} - {en?"personal trajectory":"trajectoire personnelle"}</option>)}</select></div>
    <div className="mt-5 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px] w-full" role="img" aria-label={`Courbe ${config.label}`}>
      <rect x={pad.left} y={pad.top} width={width-pad.left-pad.right} height={height-pad.top-pad.bottom} fill="#fffdfd" stroke="#d7dfdc"/>
      {ticks.map((tick,index)=><g key={index}><line x1={x(tick.x)} y1={pad.top} x2={x(tick.x)} y2={height-pad.bottom} stroke="#e7ecea" strokeWidth="1"/><line x1={pad.left} y1={y(tick.y)} x2={width-pad.right} y2={y(tick.y)} stroke="#e7ecea" strokeWidth="1"/><text x={x(tick.x)} y={height-pad.bottom+22} textAnchor="middle" fontSize="12" fill="#64748b">{tick.x.toFixed(metric==="weightHeight"?0:0)}</text><text x={pad.left-10} y={y(tick.y)+4} textAnchor="end" fontSize="12" fill="#64748b">{tick.y.toFixed(1)}</text></g>)}
      {reference.length>0&&<><polygon points={band("sd3","sd2")} fill="#fee2e2" opacity=".8"/><polygon points={band("sd2","sd2neg")} fill="#ecfdf5" opacity=".72"/><polygon points={band("sd2neg","sd3neg")} fill="#fee2e2" opacity=".8"/>{curves.map(([key,label])=><path key={key} d={line(key)} fill="none" stroke={key==="median"?"#15803d":Math.abs(curves.findIndex(item=>item[0]===key)-3)>=2?"#dc6b75":"#8b7bb8"} strokeWidth={key==="median"?3:1.6} strokeDasharray={key==="median"?"":"7 5"}><title>{label}</title></path>)}</>}
      {latest&&<line x1={x(Number(latest[config.xKey]))} y1={pad.top} x2={x(Number(latest[config.xKey]))} y2={height-pad.bottom} stroke="#2563eb" strokeDasharray="8 6" strokeWidth="1.5"/>}
      {patientPath&&<path d={patientPath} fill="none" stroke="#ec4899" strokeWidth="4"/>}
      {valid.map(item=><circle key={item.id} cx={x(Number(item[config.xKey]))} cy={y(Number(item[config.yKey]))} r="6" fill="#fff" stroke="#ec4899" strokeWidth="4"><title>{`${new Date(item.measured_at).toLocaleDateString(en?"en-GB":"fr-FR")}: ${Number(item[config.yKey]).toFixed(1)}`}</title></circle>)}
      <text x={(pad.left+width-pad.right)/2} y={height-14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{config.xLabel}</text><text x="18" y={height/2} transform={`rotate(-90 18 ${height/2})`} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{config.yLabel}</text>
      {reference.length>0&&curves.map(([key,label],index)=><g key={label} transform={`translate(${width-pad.right+8},${pad.top+index*22})`}><line x1="0" y1="0" x2="18" y2="0" stroke={key==="median"?"#15803d":"#8b7bb8"} strokeWidth={key==="median"?3:1.6} strokeDasharray={key==="median"?"":"5 3"}/><text x="23" y="4" fontSize="11" fill="#475569">{label}</text></g>)}
    </svg></div>
    <p className={`mt-4 rounded-xl p-4 text-sm ${latest?.risk_category==="high"?"bg-red-50 text-red-800":latest?.risk_category==="moderate"?"bg-amber-50 text-amber-900":"bg-mint text-forest"}`}>{reference.length?latest?.interpretation||(en?"The pink trajectory is compared with WHO curves.":"La trajectoire rose est comparee aux courbes OMS."):(en?"WHO reference unavailable for this indicator; only the personal trajectory is displayed.":"Reference OMS non disponible pour cet indicateur; seule la trajectoire personnelle est affichee.")}</p>
  </section>
}
function AlertPanel({alerts,locale}:{alerts:Row[];locale:"fr"|"en"}){const en=locale==="en";return <section><h2 className="mb-4 text-2xl font-black">{en?"Child alerts":"Alertes enfant"}</h2><div className="grid gap-3">{alerts.map(alert=><article key={alert.id} className={`rounded-2xl border-l-4 bg-white p-5 ${alert.severity==='critical'?'border-red-500':alert.severity==='warning'?'border-orange':'border-sky-500'}`}><div className="flex justify-between gap-4"><b>{alert.title}</b><span className="text-xs font-bold uppercase text-slate-400">{alert.severity}</span></div><p className="mt-2 text-sm text-slate-600">{alert.message}</p>{alert.email_sent_at&&<p className="mt-2 text-xs text-slate-400">{en?"Email notification sent.":"Notification email envoyee."}</p>}</article>)}{!alerts.length&&<p className="rounded-2xl bg-white p-6 text-slate-400">{en?"No recorded alert.":"Aucune alerte enregistree."}</p>}</div></section>}
function AdvicePanel({items,locale}:{items:Row[];locale:"fr"|"en"}){const en=locale==="en";return <section><h2 className="mb-4 text-2xl font-black">{en?"Personalized advice for parents":"Conseils personnalises aux parents"}</h2><div className="grid gap-4 md:grid-cols-2">{items.map((item,index)=><article key={`${item.category}-${index}`} className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-leaf">{item.category}</p><h3 className="mt-2 font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></article>)}{!items.length&&<p className="rounded-2xl bg-white p-6 text-slate-400 md:col-span-2">{en?"Update the analysis to receive tailored advice.":"Actualisez l'analyse pour obtenir des conseils adaptes."}</p>}</div></section>}
