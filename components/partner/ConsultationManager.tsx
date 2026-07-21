"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EyeIcon, PlusIcon, PrinterIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import {ageInMonths,calculateIycf,calculateMddw,childFoodItems,mddwFoodItems} from "@/lib/dietary-diversity";
import LabParameterEditor, { defaultLabParameters, serializeLabParameters, type LabParameter } from "@/components/health/LabParameterEditor";

type Row = Record<string, any>;
type Goal = { label: string; target: string; unit: string };

const contexts: Record<string, { complaints: string[]; goals: string[]; exams: string[] }> = {
  "perte-poids": {
    complaints: ["Prise de poids recente", "Faim frequente", "Grignotage", "Fatigue", "Essoufflement", "Troubles digestifs", "Sommeil perturbe"],
    goals: ["Poids", "Tour de taille", "Activite physique", "Qualite alimentaire", "Pression arterielle"],
    exams: ["Glycemie a jeun", "HbA1c", "Bilan lipidique", "TSH", "Transaminases"],
  },
  diabete: {
    complaints: ["Glycemies elevees", "Hypoglycemies", "Soif importante", "Urines frequentes", "Fatigue", "Perte de poids", "Difficultes alimentaires"],
    goals: ["Glycemie a jeun", "HbA1c", "Poids", "Tour de taille", "Regularite des repas"],
    exams: ["Glycemie a jeun", "HbA1c", "Creatinine et DFG", "Bilan lipidique", "Microalbuminurie"],
  },
  grossesse: {
    complaints: ["Nausees", "Vomissements", "Constipation", "Reflux", "Fatigue", "Prise de poids insuffisante", "Prise de poids excessive", "Oedemes"],
    goals: ["Poids maternel", "Pression arterielle", "Hemoglobine", "Diversite alimentaire", "Hydratation"],
    exams: ["NFS", "Ferritine", "Glycemie a jeun", "Test d hyperglycemie provoquee", "Vitamine D", "Albuminurie"],
  },
  infantile: {
    complaints: ["Faible appetit", "Refus alimentaire", "Diversification difficile", "Vomissements", "Diarrhee", "Constipation", "Croissance insuffisante"],
    goals: ["Poids", "Taille", "PB / MUAC", "Diversite alimentaire", "Frequence des repas"],
    exams: ["NFS", "Ferritine", "CRP", "Albumine", "Examen parasitologique des selles"],
  },
  general: {
    complaints: ["Fatigue", "Troubles digestifs", "Variation de poids", "Difficultes alimentaires"],
    goals: ["Poids", "Qualite alimentaire", "Activite physique"],
    exams: ["Glycemie a jeun", "NFS", "Bilan lipidique"],
  },
};

function parseArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default function ConsultationManager({ initial, clients, partnerId, dietitians = [] }: { initial: Row[]; clients: Row[]; partnerId: string; dietitians?:Row[] }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");
  const [clientId, setClientId] = useState("");
  const [pack, setPack] = useState("general");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [responsiblePartnerId,setResponsiblePartnerId]=useState(partnerId || dietitians[0]?.id || "");
  const [childId,setChildId]=useState("");
  const [preAnalysis,setPreAnalysis]=useState<Row|null>(null);
  const [analysisLoading,setAnalysisLoading]=useState(false);
  const [labParameters,setLabParameters]=useState<LabParameter[]>(defaultLabParameters);
  const client = clients.find(item => item.id === clientId);
  const children=Array.isArray(client?.children)?client.children:[];
  const selectedChild=children.find((item:Row)=>item.id===childId);
  const childAge=selectedChild?ageInMonths(selectedChild.birth_date):null;
  const iycf=childAge!==null&&childAge>=6&&childAge<=23;
  const dietaryGroups=iycf?childFoodItems:mddwFoodItems;
  const presets = contexts[pack] || contexts.general;

  function toggleGoal(label: string, checked: boolean) {
    setGoals(checked ? [...goals, { label, target: "", unit: "" }] : goals.filter(item => item.label !== label));
  }

  function clinicalAssessments(data:FormData){
    const dietaryFoods=Object.fromEntries(dietaryGroups.map(group=>[group.key,data.get(`diet_${group.key}`)==="yes"]));
    const dietary=iycf?calculateIycf({ageMonths:childAge!,breastfed:data.get("breastfed")==="yes",solidMeals:Number(data.get("solid_meals")||0),formulaFeeds:Number(data.get("formula_feeds")||0),animalMilkFeeds:Number(data.get("animal_milk_feeds")||0),yogurtDrinkFeeds:Number(data.get("yogurt_feeds")||0),foods:dietaryFoods}):calculateMddw(dietaryFoods);
    const calorieIntake=["breakfast_kcal","lunch_kcal","dinner_kcal","snacks_kcal","drinks_kcal"].reduce((sum,key)=>sum+Number(data.get(key)||0),0);
    const vigorousMinutes=(Number(data.get("vigorous_work_days")||0)*Number(data.get("vigorous_work_minutes")||0))+(Number(data.get("vigorous_leisure_days")||0)*Number(data.get("vigorous_leisure_minutes")||0));
    const moderateMinutes=(Number(data.get("moderate_work_days")||0)*Number(data.get("moderate_work_minutes")||0))+(Number(data.get("moderate_leisure_days")||0)*Number(data.get("moderate_leisure_minutes")||0))+(Number(data.get("transport_days")||0)*Number(data.get("transport_minutes")||0));
    return {laboratory_parameters:serializeLabParameters(labParameters),dietary:{module:iycf?"MAD_6_23":"MDD_10_GROUPS_ADAPTED",age_months:childAge,foods:dietaryFoods,result:dietary},calorie:{estimated_intake_kcal:calorieIntake,estimated_need_kcal:Number(data.get("estimated_need_kcal")||0),method:"24h meal estimate"},physical_activity:{met_minutes_week:vigorousMinutes*8+moderateMinutes*4,vigorous_minutes_week:vigorousMinutes,moderate_transport_minutes_week:moderateMinutes,sitting_minutes_day:Number(data.get("sitting_minutes_day")||0),method:"WHO GPAQ domains"},lifestyle:{sleep_hours:Number(data.get("sleep_hours")||0),sleep_quality:data.get("sleep_quality"),stress_level:Number(data.get("stress_level")||0),water_liters:Number(data.get("water_liters")||0),screen_hours:Number(data.get("screen_hours")||0),tobacco:data.get("tobacco"),alcohol:data.get("alcohol")}};
  }

  async function analyzeBeforePlan(form:HTMLFormElement){
    const data=new FormData(form),missingDiet=dietaryGroups.some(group=>!data.get(`diet_${group.key}`));
    if(!clientId||!String(data.get("reason")||"").trim()||missingDiet){setMessage("Selectionnez le client, renseignez le motif et terminez l'evaluation alimentaire avant l'analyse IA.");return}
    setAnalysisLoading(true);setMessage("");
    const response=await fetch("/api/consultations/pre-analysis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_id:clientId,partner_id:responsiblePartnerId,child_id:childId||null,pack_type:pack,profile:client,reason:data.get("reason"),complaints:data.getAll("complaints"),complaint_notes:data.get("complaint_notes"),clinical_assessments:clinicalAssessments(data)})}),result=await response.json();
    setAnalysisLoading(false);
    if(!response.ok){setMessage(result.message||"Analyse impossible.");return}
    setPreAnalysis(result);setMessage("Analyse preparatoire generee. Validez humainement chaque proposition avant de definir les objectifs.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!goals.some(item=>item.label.trim()&&item.target.trim())){setMessage("Definissez au moins un objectif et sa cible avant de finaliser.");return}
    setLoading(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const assessments=clinicalAssessments(data);
    const body = {
      client_id: clientId,
      partner_id: responsiblePartnerId,
      child_id:childId||null,
      pack_type: pack,
      source: data.get("source"),
      scheduled_at: data.get("scheduled_at"),
      reason: data.get("reason"),
      complaints: data.getAll("complaints"),
      complaint_notes: data.get("complaint_notes"),
      goals: goals.filter(item => item.label.trim()),
      plan: {
        actions: data.get("actions"),
        meal_plan: data.get("meal_plan"),
        monitoring: data.get("monitoring"),
        education: data.get("education"),
      },
      next_appointment_at: data.get("next_appointment_at"),
      prescription_items: data.getAll("prescription_items").map(String).filter(item => item.trim()),
      prescription_notes: data.get("prescription_notes"),
      clinical_assessments:{...assessments,pre_analysis:preAnalysis?.analysis||null},
    };
    const response = await fetch("/api/consultations/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(result.message || "Finalisation impossible."); return; }
    setRows([result, ...rows]);
    setSelected(result);
    setGoals([]);
    form.reset();
    setClientId("");
    setPack("general");
    setPreAnalysis(null);
    setLabParameters(defaultLabParameters);
    setMessage("Consultation finalisee, documents crees et prochain rendez-vous programme.");
  }

  async function openDocument(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) setMessage(error.message); else window.open(data.signedUrl, "_blank");
  }

  const registry = useMemo(() => rows.sort((a, b) => +new Date(b.finalized_at || b.scheduled_at) - +new Date(a.finalized_at || a.scheduled_at)), [rows]);

  return <div className="grid gap-7">
    <form onSubmit={submit} className="grid gap-7">
      <section className="rounded-2xl border bg-white p-6">
        <Step number="1" title="Profil du client" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {!!dietitians.length&&<label className="grid gap-2 text-sm font-bold">Nutritionniste responsable<select value={responsiblePartnerId} onChange={event=>setResponsiblePartnerId(event.target.value)} required className="admin-input"><option value="">Selectionner</option>{dietitians.map(item=><option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>}
          <label className="grid gap-2 text-sm font-bold">Client actif<select value={clientId} onChange={event => setClientId(event.target.value)} required className="admin-input"><option value="">Selectionner</option>{clients.map(item => <option key={item.id} value={item.id}>{item.full_name} - {item.username || item.email || item.client_number}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Pack / contexte<select value={pack} onChange={event => { setPack(event.target.value); setGoals([]); }} className="admin-input"><option value="general">Consultation generale</option><option value="perte-poids">Pack Perte de poids</option><option value="diabete">Pack Diabete</option><option value="grossesse">Pack Femme enceinte</option><option value="infantile">Pack Nutrition infantile</option></select></label>
          {!!children.length&&<label className="grid gap-2 text-sm font-bold">Enfant concerne (facultatif)<select value={childId} onChange={event=>setChildId(event.target.value)} className="admin-input"><option value="">Client lui-meme</option>{children.map((item:Row)=><option key={item.id} value={item.id}>{item.full_name} - {ageInMonths(item.birth_date)} mois</option>)}</select></label>}
          <label className="grid gap-2 text-sm font-bold">Date de consultation<input name="scheduled_at" type="datetime-local" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Mode<select name="source" className="admin-input"><option value="online">En ligne</option><option value="onsite">Site physique</option><option value="home_visit">Visite a domicile</option><option value="partner_direct">Initiee directement</option></select></label>
        </div>
        {client && <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-3"><Info label="Nom" value={client.full_name}/><Info label="Naissance" value={client.birth_date}/><Info label="Sexe" value={client.sex}/><Info label="Telephone" value={client.phone || client.whatsapp_phone}/><Info label="Ville" value={client.city}/><Info label="Allergies" value={client.allergies}/></div>}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <Step number="2" title="Plaintes du client" />
        <label className="mt-5 grid gap-2 text-sm font-bold">Motif principal<input name="reason" required className="admin-input" /></label>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{presets.complaints.map(item => <label key={item} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input name="complaints" value={item} type="checkbox" />{item}</label>)}</div>
        <label className="mt-4 grid gap-2 text-sm font-bold">Autres plaintes et contexte<textarea name="complaint_notes" rows={4} className="admin-input" /></label>
      </section>

      <section className="rounded-3xl border border-forest/10 bg-white p-6 shadow-soft">
        <Step number="3" title="Résultats biologiques et sanguins" />
        <p className="mt-3 text-sm leading-6 text-slate-600">Saisissez les résultats disponibles avec l’unité et les limites de référence propres au laboratoire. Ces informations seront intégrées dans l’analyse préparatoire.</p>
        <div className="mt-5"><LabParameterEditor items={labParameters} onChange={setLabParameters}/></div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <Step number="4" title="Evaluation alimentaire, energetique et mode de vie" />
        <div className="mt-5 rounded-xl bg-mint p-4 text-sm text-forest"><b>{iycf?"MAD OMS/UNICEF 6-23 mois":"Diversite alimentaire adaptee sur 10 groupes"}</b><p className="mt-1">{iycf?"Le calcul combine diversite minimale, frequence minimale des repas et, si non allaite, frequence des apports lactes.":"Pour les femmes de 15-49 ans, le seuil 5/10 correspond au MDD-W FAO. Pour les autres personnes de plus de 2 ans, il est affiche comme repere adapte de diversite et non comme indicateur MDD-W valide."}</p></div>
        {iycf&&<div className="mt-4 grid gap-3 md:grid-cols-5"><MiniSelect name="breastfed" label="Allaite actuellement"/><MiniNumber name="solid_meals" label="Repas solides"/><MiniNumber name="formula_feeds" label="Formule infantile"/><MiniNumber name="animal_milk_feeds" label="Lait animal"/><MiniNumber name="yogurt_feeds" label="Yaourt liquide"/></div>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">{dietaryGroups.map(group=><fieldset key={group.key} className="rounded-xl border bg-slate-50 p-4"><legend className="font-black">{group.labelFr}</legend><p className="mt-1 text-xs text-slate-500">{group.examplesFr}</p><div className="mt-3 flex gap-4">{["yes","no"].map(value=><label key={value} className="flex gap-2 text-sm font-bold"><input type="radio" name={`diet_${group.key}`} value={value} required/>{value==="yes"?"Oui":"Non"}</label>)}</div></fieldset>)}</div>
        <h3 className="mt-7 font-black">Estimation des apports sur 24 heures</h3><p className="text-xs text-slate-500">Estimation de consultation à partir des portions rapportees ; elle ne remplace pas une analyse nutritionnelle pesee.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><MiniNumber name="breakfast_kcal" label="Petit-dejeuner (kcal)"/><MiniNumber name="lunch_kcal" label="Dejeuner (kcal)"/><MiniNumber name="dinner_kcal" label="Diner (kcal)"/><MiniNumber name="snacks_kcal" label="Collations (kcal)"/><MiniNumber name="drinks_kcal" label="Boissons (kcal)"/><MiniNumber name="estimated_need_kcal" label="Besoin estime (kcal/j)"/></div>
        <h3 className="mt-7 font-black">Activite physique - domaines GPAQ OMS</h3><div className="mt-3 grid gap-3 md:grid-cols-3"><MiniNumber name="vigorous_work_days" label="Travail intense (jours/sem.)"/><MiniNumber name="vigorous_work_minutes" label="Travail intense (min/jour)"/><MiniNumber name="moderate_work_days" label="Travail modere (jours/sem.)"/><MiniNumber name="moderate_work_minutes" label="Travail modere (min/jour)"/><MiniNumber name="transport_days" label="Marche/velo transport (jours)"/><MiniNumber name="transport_minutes" label="Transport actif (min/jour)"/><MiniNumber name="vigorous_leisure_days" label="Sport intense (jours)"/><MiniNumber name="vigorous_leisure_minutes" label="Sport intense (min/jour)"/><MiniNumber name="moderate_leisure_days" label="Loisir modere (jours)"/><MiniNumber name="moderate_leisure_minutes" label="Loisir modere (min/jour)"/><MiniNumber name="sitting_minutes_day" label="Temps assis (min/jour)"/></div>
        <h3 className="mt-7 font-black">Style de vie</h3><div className="mt-3 grid gap-3 md:grid-cols-3"><MiniNumber name="sleep_hours" label="Sommeil (heures/nuit)" step="0.5"/><label className="grid gap-2 text-sm font-bold">Qualite du sommeil<select name="sleep_quality" className="admin-input"><option value="good">Bonne</option><option value="average">Moyenne</option><option value="poor">Faible</option></select></label><MiniNumber name="stress_level" label="Stress percu (0-10)"/><MiniNumber name="water_liters" label="Eau (litres/jour)" step="0.1"/><MiniNumber name="screen_hours" label="Ecrans hors travail (h/j)" step="0.5"/><MiniSelect name="tobacco" label="Tabac"/><MiniSelect name="alcohol" label="Alcool"/></div>
      </section>

      <section className="rounded-2xl border-2 border-leaf bg-white p-6">
        <Step number="5" title="Analyse IA preparatoire" />
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">Cette aide analyse les informations disponibles avant la fixation des objectifs et du plan. Elle ne pose aucun diagnostic, ne prescrit rien et doit etre validee par le nutritionniste.</p>
        <button type="button" onClick={event=>analyzeBeforePlan(event.currentTarget.form!)} disabled={analysisLoading||!clientId} className="btn-primary mt-5"><SparklesIcon className="mr-2 h-5"/>{analysisLoading?"Analyse en cours...":"Analyser les informations disponibles"}</button>
        {preAnalysis&&<div className="mt-6 grid gap-4"><div className="rounded-xl bg-mint p-5"><h3 className="font-black">Synthese professionnelle</h3><p className="mt-2 text-sm leading-6">{preAnalysis.analysis?.summary}</p></div><div className="grid gap-4 md:grid-cols-2"><AnalysisList title="Constats" items={preAnalysis.analysis?.findings}/><AnalysisList title="Points de vigilance" items={preAnalysis.analysis?.attentionPoints}/><AnalysisList title="Donnees manquantes" items={preAnalysis.analysis?.missingData}/><AnalysisList title="Objectifs a envisager" items={preAnalysis.analysis?.suggestedObjectives}/><AnalysisList title="Questions a verifier" items={preAnalysis.analysis?.questionsToVerify}/><AnalysisList title="Limites" items={preAnalysis.analysis?.limitations}/></div><div className="flex flex-wrap gap-3"><button type="button" onClick={()=>openDocument(preAnalysis.pdf_path)} className="btn-secondary">Ouvrir le PDF de l'analyse</button><button type="button" onClick={()=>setGoals([...(preAnalysis.analysis?.suggestedObjectives||[]).map((label:string)=>({label,target:"",unit:""})),...goals])} className="btn-secondary">Reprendre les objectifs suggeres</button></div><p className="text-xs font-bold text-orange">{preAnalysis.warning}</p></div>}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <Step number="6" title="Objectifs a atteindre" />
        <div className="mt-4 flex flex-wrap gap-2">{presets.goals.map(item => <label key={item} className="flex gap-2 rounded-full border px-4 py-2 text-sm font-bold"><input type="checkbox" checked={goals.some(goal => goal.label === item)} onChange={event => toggleGoal(item, event.target.checked)} />{item}</label>)}</div>
        <div className="mt-4 grid gap-3">{goals.map((goal, index) => <div key={`${goal.label}-${index}`} className="grid gap-3 md:grid-cols-[1.3fr_1fr_.7fr_auto]"><input value={goal.label} onChange={event => setGoals(goals.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} placeholder="Parametre" className="admin-input"/><input value={goal.target} onChange={event => setGoals(goals.map((item, i) => i === index ? { ...item, target: event.target.value } : item))} placeholder="Cible a atteindre" className="admin-input"/><input value={goal.unit} onChange={event => setGoals(goals.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} placeholder="Unite" className="admin-input"/><button type="button" aria-label="Supprimer" onClick={() => setGoals(goals.filter((_, i) => i !== index))} className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700"><XMarkIcon className="h-5"/></button></div>)}</div>
        <button type="button" onClick={() => setGoals([...goals, { label: "", target: "", unit: "" }])} className="btn-secondary mt-4 px-4 py-2"><PlusIcon className="mr-2 h-4"/>Ajouter un parametre</button>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <Step number="7" title="Plan pour atteindre les objectifs" />
        <div className="mt-5 grid gap-4 md:grid-cols-2"><Area name="actions" label="Actions prioritaires"/><Area name="meal_plan" label="Plan alimentaire"/><Area name="monitoring" label="Mesures et rythme de suivi"/><Area name="education" label="Education nutritionnelle et conseils"/></div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <Step number="8" title="Prochain rendez-vous" />
        <p className="mt-2 text-sm text-slate-500">La date sera automatiquement ajoutee dans la salle de reunion du client et du nutritionniste.</p>
        <input name="next_appointment_at" type="datetime-local" required className="admin-input mt-4 max-w-md" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <Step number="9" title="Ordonnance d'examens" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{presets.exams.map(item => <label key={item} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input name="prescription_items" value={item} type="checkbox" />{item}</label>)}</div>
        <label className="mt-4 grid gap-2 text-sm font-bold">Examens supplementaires<input name="prescription_items" className="admin-input" placeholder="Saisir un examen supplementaire" /></label>
        <label className="mt-4 grid gap-2 text-sm font-bold">Indications et commentaires<textarea name="prescription_notes" rows={3} className="admin-input" /></label>
      </section>

      {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
      <button disabled={loading || !clientId} className="btn-primary justify-self-start">{loading ? "Finalisation..." : "Finaliser la consultation et generer les documents"}</button>
    </form>

    <section className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Registre des consultations</h2><p className="text-sm text-slate-500">{registry.length} consultation(s)</p></div><button type="button" onClick={() => window.print()} className="btn-secondary px-4 py-2"><PrinterIcon className="mr-2 h-4"/>Imprimer le registre</button></div>
      <div className="mt-5 grid gap-3">{registry.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><b>{row.client_profiles?.full_name || "Client"} - {row.reason || row.pack_type}</b><p className="mt-1 text-sm text-slate-500">{new Date(row.finalized_at || row.scheduled_at).toLocaleString("fr-FR")} - {row.pack_type || "general"}</p></div><button type="button" onClick={() => setSelected(row)} className="btn-secondary px-4 py-2"><EyeIcon className="mr-2 h-4"/>Voir</button></article>)}{!registry.length && <p className="text-slate-400">Aucune consultation.</p>}</div>
    </section>

    {selected && <ConsultationDetails row={selected} close={() => setSelected(null)} openDocument={openDocument}/>}
  </div>;
}

function Step({ number, title }: { number: string; title: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-sm font-black text-white">{number}</span><h2 className="text-xl font-black">{title}</h2></div>;
}
function Info({ label, value }: { label: string; value: unknown }) {
  return <p><b>{label} :</b> {String(value || "Non renseigne")}</p>;
}
function Area({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<textarea name={name} rows={4} required={name==="actions"||name==="monitoring"} className="admin-input" /></label>;
}
function MiniNumber({name,label,step="1"}:{name:string;label:string;step?:string}){return <label className="grid gap-2 text-sm font-bold">{label}<input name={name} type="number" min="0" step={step} className="admin-input"/></label>}
function MiniSelect({name,label}:{name:string;label:string}){return <label className="grid gap-2 text-sm font-bold">{label}<select name={name} className="admin-input"><option value="no">Non</option><option value="yes">Oui</option></select></label>}
function AnalysisList({title,items}:{title:string;items?:string[]}){return <section className="rounded-xl bg-slate-50 p-4"><h3 className="font-black">{title}</h3><ul className="mt-2 grid gap-2 text-sm text-slate-600">{(items||[]).map((item,index)=><li key={`${item}-${index}`}>- {item}</li>)}{!items?.length&&<li>-</li>}</ul></section>}
function ConsultationDetails({ row, close, openDocument }: { row: Row; close: () => void; openDocument: (path?: string) => void }) {
  const goals = parseArray(row.goals);
  return <div className="nvg-modal-backdrop fixed inset-0 z-[100] overflow-y-auto p-4"><article className="nvg-modal-panel mx-auto my-8 max-w-4xl bg-white p-7 print:my-0 print:max-w-none"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase text-leaf">Consultation finalisee</p><h2 className="text-2xl font-black">{row.client_profiles?.full_name || "Client"}</h2><p className="text-sm text-slate-500">{new Date(row.finalized_at || row.scheduled_at).toLocaleString("fr-FR")}</p></div><button type="button" onClick={close} aria-label="Fermer"><XMarkIcon className="h-7"/></button></div>
    <div className="mt-7 grid gap-5 md:grid-cols-2"><Detail title="Plaintes" text={`${parseArray(row.complaints).join(", ")} ${row.complaint_notes || ""}`}/><Detail title="Objectifs" text={goals.map((item: any) => `${item.label}: ${item.target || "-"} ${item.unit || ""}`).join("\n")}/><Detail title="Evaluations" text={row.clinical_assessments?JSON.stringify(row.clinical_assessments,null,2):"-"}/><Detail title="Plan" text={Object.values(row.care_plan || {}).filter(Boolean).join("\n")}/><Detail title="Prochain rendez-vous" text={row.next_appointment_at ? new Date(row.next_appointment_at).toLocaleString("fr-FR") : "Non programme"}/><Detail title="Examens" text={parseArray(row.prescription_items).join("\n")}/></div>
    <PrintableAccessQr email={row.client_profiles?.email}/>
    <div className="mt-7 flex flex-wrap gap-3 print:hidden"><button type="button" onClick={() => window.print()} className="btn-secondary"><PrinterIcon className="mr-2 h-4"/>Imprimer la fiche</button><button type="button" onClick={() => openDocument(row.consultation_pdf_path)} className="btn-primary">Compte rendu PDF</button>{row.prescription_pdf_path && <button type="button" onClick={() => openDocument(row.prescription_pdf_path)} className="btn-secondary">Ordonnance PDF</button>}</div>
  </article></div>;
}
function Detail({ title, text }: { title: string; text: string }) {
  return <section className="rounded-xl bg-slate-50 p-4"><h3 className="font-black">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{text || "-"}</p></section>;
}
function PrintableAccessQr({ email }: { email?: string }) {
  const [src,setSrc]=useState("");
  useEffect(()=>{QRCode.toDataURL(`${location.origin}/connexion?identifiant=${encodeURIComponent(email||"")}&redirect=${encodeURIComponent("/espace-client/consultations")}`,{width:220,margin:1}).then(setSrc)},[email]);
  return src?<div className="mt-7 flex items-center gap-3 border-t pt-5"><img src={src} alt="QR acces securise" className="h-20 w-20"/><p className="max-w-xs text-xs text-slate-500">Scannez pour vous connecter et retrouver cette consultation. L'adresse email sera deja renseignee.</p></div>:null;
}
