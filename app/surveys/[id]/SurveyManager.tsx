'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import QRCode from 'react-qr-code';
import {
  Activity, BarChart3, ClipboardList, Database, Download, FileSpreadsheet,
  FlaskConical, MapPinned, Plus, Save, Send, Settings2, Trash2, Users,
} from 'lucide-react';
import { analyzeDataset, crossTab } from '@/survey/lib/analysis';
import { analyzeEnaSmartPlausibility } from '@/survey/lib/ena-smart-plausibility';
import { calculateSurveyIndicators } from '@/survey/lib/food-security-indicators';
import { exportQuestionnaireWorkbook, parseXlsForm, type SurveyQuestion } from '@/survey/lib/xlsform';
import { calculateLFAzScore, calculateWFAzScore, calculateWFLzScore, classifyLFAzScore, classifyWFLzScore } from '@/survey/lib/who-growth-standards';

type Row = Record<string, any>;
type Resource = 'team' | 'clusters' | 'samples' | 'forms' | 'responses' | 'reports';
type Tab = 'overview' | 'team' | 'sampling' | 'questionnaire' | 'collection' | 'analysis' | 'reports';

const tabItems: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Cadrage', icon: Settings2 },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'sampling', label: 'Echantillonnage', icon: MapPinned },
  { id: 'questionnaire', label: 'Questionnaires', icon: ClipboardList },
  { id: 'collection', label: 'Collecte', icon: Database },
  { id: 'analysis', label: 'Analyse', icon: BarChart3 },
  { id: 'reports', label: 'Rapports', icon: FileSpreadsheet },
];

export default function SurveyManager({ initialSurvey }: { initialSurvey: Row }) {
  const [survey, setSurvey] = useState(initialSurvey);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [resources, setResources] = useState<Record<Resource, Row[]>>({ team: [], clusters: [], samples: [], forms: [], responses: [], reports: [] });
  const [message, setMessage] = useState('');
  const base = `/api/surveys/${survey.id}`;

  async function load(resource: Resource) {
    const response = await fetch(`${base}/resources?resource=${resource}`);
    const result = await response.json();
    if (response.ok) setResources(current => ({ ...current, [resource]: result.items || [] }));
  }
  useEffect(() => {
    (Object.keys(resources) as Resource[]).forEach(load);
  }, []);

  async function mutate(resource: Resource, method: 'POST' | 'PATCH' | 'DELETE', payload?: Row, item?: string) {
    const url = `${base}/resources?resource=${resource}${item ? `&item=${item}` : ''}`;
    const response = await fetch(url, {
      method,
      headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Operation impossible.');
    await load(resource);
    return result.item;
  }

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 p-5 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit rounded-lg bg-forest p-3 text-white lg:sticky lg:top-5">
        <p className="px-3 py-3 text-xs font-black uppercase tracking-widest text-white/50">Cycle de l enquete</p>
        <nav className="grid gap-1">{tabItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold ${activeTab === id ? 'bg-white text-forest' : 'text-white/75 hover:bg-white/10'}`}><Icon className="h-5" />{label}</button>)}</nav>
      </aside>
      <section className="min-w-0">
        {message && <p className="mb-5 rounded-lg bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
        {activeTab === 'overview' && <Overview survey={survey} onSaved={setSurvey} setMessage={setMessage} />}
        {activeTab === 'team' && <Team surveyId={survey.id} items={resources.team} mutate={mutate} setMessage={setMessage} />}
        {activeTab === 'sampling' && <Sampling clusters={resources.clusters} samples={resources.samples} mutate={mutate} setMessage={setMessage} />}
        {activeTab === 'questionnaire' && <Questionnaires surveyId={survey.id} forms={resources.forms} mutate={mutate} setMessage={setMessage} />}
        {activeTab === 'collection' && <Collection forms={resources.forms} responses={resources.responses} clusters={resources.clusters} team={resources.team} mutate={mutate} setMessage={setMessage} />}
        {activeTab === 'analysis' && <Analysis survey={survey} forms={resources.forms} responses={resources.responses} mutate={mutate} setMessage={setMessage} />}
        {activeTab === 'reports' && <Reports surveyId={survey.id} reports={resources.reports} />}
      </section>
    </div>
  );
}

function Panel({ title, text, actions, children }: { title: string; text?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-lg border bg-white"><header className="flex flex-wrap items-start justify-between gap-4 border-b p-6"><div><h2 className="text-xl font-black">{title}</h2>{text && <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>}</div>{actions}</header><div className="p-6">{children}</div></section>;
}

function Overview({ survey, onSaved, setMessage }: { survey: Row; onSaved: (row: Row) => void; setMessage: (value: string) => void }) {
  const [countries, setCountries] = useState<Array<{ name: string }>>([]);
  useEffect(() => {
    fetch('/api/geo?type=countries').then(response => response.json()).then(setCountries).catch(() => setCountries([]));
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/surveys/${survey.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const result = await response.json();
    if (response.ok) { onSaved(result.survey); setMessage('Parametres de l enquete enregistres.'); }
  }
  return <Panel title="Cadrage de l enquete" text="Definissez le perimetre, le calendrier et l etape actuelle."><form onSubmit={save} className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Titre<input name="title" defaultValue={survey.title} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Pays<select name="country" defaultValue={survey.country || ''} className="admin-input"><option value="">Selectionner un pays</option>{countries.map(country => <option key={country.name} value={country.name}>{country.name}</option>)}{survey.country && !countries.some(country => country.name === survey.country) && <option value={survey.country}>{survey.country}</option>}</select></label><label className="grid gap-2 text-sm font-bold">Debut<input type="date" name="starts_at" defaultValue={survey.starts_at || ''} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Fin<input type="date" name="ends_at" defaultValue={survey.ends_at || ''} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={survey.status} className="admin-input"><option value="planned">Planification</option><option value="collecting">Collecte</option><option value="analysis">Analyse</option><option value="completed">Terminee</option><option value="archived">Archivee</option></select></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Description<textarea name="description" defaultValue={survey.description || ''} rows={5} className="admin-input" /></label><button className="btn-primary md:col-span-2"><Save className="mr-2 h-4" />Enregistrer</button></form></Panel>;
}

function Team({ items, mutate, setMessage }: { surveyId: string; items: Row[]; mutate: any; setMessage: (value: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    await mutate('team', 'POST', values); form.reset(); setMessage('Membre ajoute a l equipe.');
  }
  return <div className="grid gap-6"><Panel title="Equipe de l enquete" text="Proprietaire, managers, superviseurs, enqueteurs, guides et analystes."><form onSubmit={submit} className="grid gap-3 md:grid-cols-3"><input name="first_name" required placeholder="Prenom" className="admin-input" /><input name="last_name" required placeholder="Nom" className="admin-input" /><select name="role" className="admin-input"><option>Manager</option><option>Superviseur</option><option>Enqueteur</option><option>Guide de terrain</option><option>Analyste</option><option>Autre</option></select><input name="email" type="email" placeholder="Email" className="admin-input" /><input name="phone" placeholder="Telephone" className="admin-input" /><button className="btn-primary"><Plus className="mr-2 h-4" />Ajouter</button></form></Panel><Panel title={`${items.length} membre(s)`}>{items.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Nom</th><th className="p-3">Role</th><th className="p-3">Contact</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t"><td className="p-3 font-bold">{item.first_name} {item.last_name}</td><td className="p-3">{item.role}</td><td className="p-3">{item.email || item.phone || '-'}</td><td className="p-3 text-right"><button onClick={() => mutate('team', 'DELETE', undefined, item.id)} className="text-red-700"><Trash2 className="h-4" /></button></td></tr>)}</tbody></table></div> : <Empty text="Aucun membre ajoute." />}</Panel></div>;
}

function Sampling({clusters,samples,mutate,setMessage}:{clusters:Row[];samples:Row[];mutate:any;setMessage:(value:string)=>void}){
  const [villages,setVillages]=useState([{code:'',name:'',population:''}]),[unit,setUnit]=useState<'clusters'|'villages'>('clusters'),[count,setCount]=useState(1);
  async function add(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,fd=new FormData(form),clean=villages.filter(item=>item.name.trim()).map((item,index)=>({id:`${fd.get('cluster_code')}-${item.code||index+1}`,code:item.code||`${fd.get('cluster_code')}-${index+1}`,name:item.name.trim(),population:Number(item.population)||0}));await mutate('clusters','POST',{cluster_code:fd.get('cluster_code'),cluster_name:fd.get('cluster_name'),region:fd.get('region')||null,district:fd.get('district')||null,population:Number(fd.get('population'))||clean.reduce((sum,item)=>sum+item.population,0),villages:clean});form.reset();setVillages([{code:'',name:'',population:''}]);setMessage('Élément ajouté à la base de sondage.');}
  async function draw(){const units=unit==='clusters'?clusters.map(cluster=>({id:cluster.id,name:cluster.cluster_name,population:Number(cluster.population||0),cluster})):clusters.flatMap(cluster=>(cluster.villages||[]).map((village:Row)=>({id:village.id,name:village.name,population:Number(village.population||0),cluster,village}))),total=units.reduce((sum,item)=>sum+item.population,0),target=Math.min(Math.max(1,count),units.length);if(!total||!target)return setMessage('Ajoutez des unités avec une population positive.');const interval=total/target,start=Math.random()*interval,selected=new Map<string,Row>();let cumulative=0,point=start;for(const item of units){const previous=cumulative;cumulative+=item.population;while(point<=cumulative&&selected.size<target){selected.set(item.id,{...item,probability:item.population/total,interval_start:previous,interval_end:cumulative});point+=interval;}}if(unit==='clusters'){for(const item of selected.values())if(!samples.some(sample=>sample.cluster_id===item.cluster.id))await mutate('samples','POST',{cluster_id:item.cluster.id,probability:item.probability,interval_start:item.interval_start,interval_end:item.interval_end,selected_villages:[]});}else{const grouped=new Map<string,Row[]>();for(const item of selected.values())grouped.set(item.cluster.id,[...(grouped.get(item.cluster.id)||[]),{...item.village,probability:item.probability}]);for(const [clusterId,selectedVillages] of grouped){const existing=samples.find(sample=>sample.cluster_id===clusterId);if(existing)await mutate('samples','PATCH',{selected_villages:selectedVillages},existing.id);else await mutate('samples','POST',{cluster_id:clusterId,probability:selectedVillages.reduce((sum,item)=>sum+Number(item.probability),0),selected_villages:selectedVillages});}}setMessage(`${selected.size} ${unit==='clusters'?'grappe(s)':'village(s)/ZD'} tiré(e)(s).`);}
  const max=unit==='clusters'?clusters.length:clusters.reduce((sum,item)=>sum+(item.villages||[]).length,0);
  return <div className="grid gap-6"><Panel title="Étape 1 : Base de sondage" text="Ajoutez les villages/ZD progressivement avec leur population."><form onSubmit={add} className="grid gap-3 md:grid-cols-3"><input name="cluster_code" required placeholder="Code grappe" className="admin-input"/><input name="cluster_name" required placeholder="Nom grappe" className="admin-input"/><input name="population" type="number" min="0" placeholder="Population grappe (optionnelle)" className="admin-input"/><input name="region" placeholder="Région" className="admin-input"/><input name="district" placeholder="District" className="admin-input"/><div className="md:col-span-3"><div className="flex justify-between"><b>Villages / zones de dénombrement</b><button type="button" onClick={()=>setVillages(current=>[...current,{code:'',name:'',population:''}])} className="btn-secondary"><Plus className="mr-2 h-4"/>Ajouter</button></div><div className="mt-3 grid gap-2">{villages.map((village,index)=><div key={index} className="grid gap-2 md:grid-cols-[160px_1fr_180px_auto]"><input value={village.code} onChange={e=>setVillages(current=>current.map((item,i)=>i===index?{...item,code:e.target.value}:item))} placeholder="Code ZD" className="admin-input"/><input value={village.name} onChange={e=>setVillages(current=>current.map((item,i)=>i===index?{...item,name:e.target.value}:item))} placeholder="Nom village/ZD" className="admin-input"/><input value={village.population} onChange={e=>setVillages(current=>current.map((item,i)=>i===index?{...item,population:e.target.value}:item))} type="number" min="0" placeholder="Population" className="admin-input"/><button type="button" onClick={()=>setVillages(current=>current.filter((_,i)=>i!==index))} className="rounded-md bg-red-50 px-3 text-red-700"><Trash2 className="h-4"/></button></div>)}</div></div><button className="btn-primary md:col-span-3">Ajouter à la base</button></form><div className="mt-5 grid gap-3">{clusters.map(cluster=><article key={cluster.id} className="rounded-md border p-4"><div className="flex justify-between"><b>{cluster.cluster_code} - {cluster.cluster_name}</b><button onClick={()=>mutate('clusters','DELETE',undefined,cluster.id)} className="text-red-700"><Trash2 className="h-4"/></button></div><p className="text-sm text-slate-500">{Number(cluster.population||0).toLocaleString('fr-FR')} habitants</p>{(cluster.villages||[]).map((village:Row)=><p key={village.id} className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm">{village.code} - {village.name}<b className="float-right">{Number(village.population||0).toLocaleString('fr-FR')}</b></p>)}</article>)}</div></Panel><Panel title="Étape 2 : Tirage PPS" text="Choisissez l’unité et le nombre exact à tirer." actions={<div className="flex flex-wrap gap-2"><select value={unit} onChange={e=>setUnit(e.target.value as typeof unit)} className="admin-input"><option value="clusters">Grappes</option><option value="villages">Villages / ZD</option></select><input type="number" min="1" max={Math.max(1,max)} value={count} onChange={e=>setCount(Number(e.target.value))} className="admin-input w-24"/><button onClick={draw} className="btn-primary">Tirer</button></div>}>{samples.length?<div className="grid gap-3">{samples.map(sample=>{const cluster=clusters.find(item=>item.id===sample.cluster_id);return <article key={sample.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><b>{cluster?.cluster_name}</b>{sample.selected_villages?.length?sample.selected_villages.map((village:Row)=><p key={village.id} className="text-sm">{village.code} - {village.name}</p>):<p className="text-sm">Grappe sélectionnée</p>}</article>})}</div>:<Empty text="Aucun élément tiré."/>}</Panel></div>;
}

function SamplingLegacy({ clusters, samples, mutate, setMessage }: { clusters: Row[]; samples: Row[]; mutate: any; setMessage: (value: string) => void }) {
  const [sampleSize, setSampleSize] = useState(1);
  const [drawUnit,setDrawUnit]=useState<'clusters'|'villages'>('clusters');
  async function addCluster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    const villages=String(values.villages||'').split('\n').map((line,index)=>{const [code,name,population]=line.split('|').map(value=>value.trim());return{id:`${values.cluster_code}-${code||index+1}`,code:code||`${values.cluster_code}-${index+1}`,name:name||code,population:Number(population)||0}}).filter(item=>item.name);
    const population=Number(values.population)||villages.reduce((sum,item)=>sum+item.population,0);
    await mutate('clusters', 'POST', { ...values, population, villages }); form.reset(); setMessage('Grappe et villages/ZD ajoutes a la base de sondage.');
  }
  async function drawPps() {
    if(drawUnit==='villages'){
      const units=clusters.flatMap(cluster=>(cluster.villages||[]).map((village:Row)=>({cluster,village,population:Number(village.population||0)})));
      const total=units.reduce((sum,item)=>sum+item.population,0),count=Math.min(Math.max(1,sampleSize),units.length);
      if(!total||!count)return setMessage('Renseignez la population de chaque village/ZD avant le tirage.');
      const interval=total/count,start=Math.random()*interval,selected:Row[]=[];let cumulative=0,point=start;
      for(const unit of units){cumulative+=unit.population;while(point<=cumulative&&selected.length<count){if(!selected.some(item=>item.village.id===unit.village.id))selected.push(unit);point+=interval;}}
      const grouped=new Map<string,Row[]>();selected.forEach(item=>grouped.set(item.cluster.id,[...(grouped.get(item.cluster.id)||[]),item.village]));
      for(const [clusterId,selectedVillages] of grouped){const existing=samples.find(sample=>sample.cluster_id===clusterId);if(existing)await mutate('samples','PATCH',{selected_villages:selectedVillages},existing.id);else await mutate('samples','POST',{cluster_id:clusterId,probability:selectedVillages.reduce((sum,item)=>sum+Number(item.population||0),0)/total,selected_villages:selectedVillages});}
      setMessage(`${selected.length} village(s)/ZD tire(e)(s).`);return;
    }
    const total = clusters.reduce((sum, cluster) => sum + Number(cluster.population || 0), 0);
    const count = Math.min(Math.max(1, sampleSize), clusters.length);
    if (!total || !count) return setMessage('Renseignez les populations avant le tirage PPS.');
    const interval = total / count; const start = Math.random() * interval; const selected = new Map<string, Row>();
    let cumulative = 0; let point = start;
    for (const cluster of clusters) {
      const previous = cumulative; cumulative += Number(cluster.population || 0);
      while (point <= cumulative && selected.size < count) { selected.set(cluster.id, { cluster, probability: Number(cluster.population || 0) / total, interval_start: previous, interval_end: cumulative }); point += interval; }
    }
    for (const value of selected.values()) if (!samples.some(sample => sample.cluster_id === value.cluster.id)) await mutate('samples', 'POST', { cluster_id: value.cluster.id, probability: value.probability, interval_start: value.interval_start, interval_end: value.interval_end });
    setMessage(`${selected.size} grappe(s) tiree(s) par probabilite proportionnelle a la taille.`);
  }
  return <div className="grid gap-6"><Panel title="Etape 1: Base de sondage" text="Definissez les grappes, leurs villages et leurs populations."><form onSubmit={addCluster} className="grid gap-3 md:grid-cols-3"><input name="cluster_code" required placeholder="Code grappe" className="admin-input" /><input name="cluster_name" required placeholder="Nom de la grappe" className="admin-input" /><input name="population" required type="number" min="0" placeholder="Population" className="admin-input" /><input name="region" placeholder="Region" className="admin-input" /><input name="district" placeholder="District" className="admin-input" /><textarea name="villages" placeholder="Villages, un par ligne" className="admin-input md:row-span-2" /><button className="btn-primary md:col-span-2"><Plus className="mr-2 h-4" />Ajouter la grappe</button></form><div className="mt-6 grid gap-3">{clusters.map(cluster => <article key={cluster.id} className="flex items-center justify-between rounded-md border p-4"><div><b>{cluster.cluster_code} - {cluster.cluster_name}</b><p className="text-sm text-slate-500">{cluster.region || '-'} / {cluster.district || '-'} · {Number(cluster.population).toLocaleString('fr-FR')} habitants · {(cluster.villages || []).length} village(s)</p></div><button onClick={() => mutate('clusters', 'DELETE', undefined, cluster.id)} className="text-red-700"><Trash2 className="h-4" /></button></article>)}</div></Panel><Panel title="Etape 2: Tirage PPS" text="Tirage systematique avec probabilite proportionnelle a la population." actions={<div className="flex gap-2"><input type="number" min="1" max={Math.max(1, clusters.length)} value={sampleSize} onChange={event => setSampleSize(Number(event.target.value))} className="admin-input w-24" /><button onClick={drawPps} className="btn-primary"><FlaskConical className="mr-2 h-4" />Tirer</button></div>}>{samples.length ? <div className="grid gap-3">{samples.map(sample => { const cluster = clusters.find(item => item.id === sample.cluster_id); return <article key={sample.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-4"><b>{cluster?.cluster_name || sample.cluster_id}</b><p className="text-sm text-emerald-800">Probabilite: {(Number(sample.probability || 0) * 100).toFixed(2)}% · Statut: {sample.status}</p></article>; })}</div> : <Empty text="Aucune grappe tiree." />}</Panel></div>;
}

function Questionnaires({ surveyId, forms, mutate, setMessage }: { surveyId: string; forms: Row[]; mutate: any; setMessage: (value: string) => void }) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [odkForm, setOdkForm] = useState<Row | null>(null);
  const addQuestion = () => setQuestions(current => [...current, { id: crypto.randomUUID(), type: 'text', name: `question_${current.length + 1}`, label: '' }]);
  async function importFile(file?: File) {
    if (!file) return; const parsed = parseXlsForm(await file.arrayBuffer()); setQuestions(parsed.questions); setTitle(file.name.replace(/\.[^.]+$/, '')); setMessage(`${parsed.questions.length} question(s) importee(s) du XLSForm.`);
  }
  async function saveForm() {
    if (!title.trim() || !questions.length) return setMessage('Ajoutez un titre et au moins une question.');
    await mutate('forms', 'POST', { title, form_code: `${title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${Date.now()}`, definition: { questions }, source_type: 'builder', status: 'draft' });
    setTitle(''); setQuestions([]); setMessage('Questionnaire enregistre en brouillon.');
  }
  async function status(form: Row, next: string) {
    await mutate('forms', 'PATCH', { id: form.id, status: next, status_history: [...(form.status_history || []), { status: next, at: new Date().toISOString() }] }); setMessage(`Statut du formulaire: ${next}.`);
  }
  return <div className="grid gap-6"><Panel title="Etape 3: Conception du questionnaire" text="Importez un XLSForm ou utilisez le constructeur complet avec propriétés avancées, langues, groupes et listes de choix."><div className="flex flex-wrap gap-3"><label className="btn-secondary cursor-pointer"><FileSpreadsheet className="mr-2 h-4" />Importer XLSForm<input type="file" accept=".xlsx,.xls" className="hidden" onChange={event => importFile(event.target.files?.[0])} /></label><Link href={`/surveys/${surveyId}/questionnaire`} className="btn-primary"><Plus className="mr-2 h-4" />Créer un questionnaire</Link></div><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Titre du questionnaire importé" className="admin-input mt-5" /><div className="mt-4 grid gap-3">{questions.map((question, index) => <div key={question.id} className="grid gap-3 rounded-md border p-4 md:grid-cols-[160px_1fr_1fr_auto]"><select value={question.type} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, type: event.target.value as SurveyQuestion['type'] } : item))} className="admin-input"><option value="text">Texte</option><option value="integer">Entier</option><option value="decimal">Décimal</option><option value="date">Date</option><option value="select_one">Choix unique</option><option value="select_multiple">Choix multiple</option><option value="note">Note</option></select><input value={question.name} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, name: event.target.value } : item))} className="admin-input" placeholder="nom_variable" /><input value={question.label} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, label: event.target.value } : item))} className="admin-input" placeholder={`Libelle question ${index + 1}`} /><button onClick={() => setQuestions(current => current.filter(item => item.id !== question.id))} className="text-red-700"><Trash2 className="h-4" /></button>{question.type.startsWith('select_') && <textarea className="admin-input md:col-span-3 md:col-start-2" placeholder="Options, une par ligne" value={(question.options || []).map(option => option.label).join('\n')} onChange={event => setQuestions(current => current.map(item => item.id === question.id ? { ...item, options: event.target.value.split('\n').filter(Boolean).map((label, optionIndex) => ({ value: `option_${optionIndex + 1}`, label })) } : item))} />}</div>)}</div>{questions.length > 0 && <button onClick={saveForm} className="btn-primary mt-4"><Save className="mr-2 h-4" />Enregistrer l import</button>}</Panel><Panel title="Etape 4: Workflow des formulaires">{forms.length ? <div className="grid gap-3">{forms.map(form => <article key={form.id} className="rounded-md border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>{form.title}</b><p className="text-sm text-slate-500">{form.form_code} · version {form.version} · {form.status}</p>{form.odk_status && form.odk_status !== 'not_configured' && <p className="mt-1 text-xs font-bold text-emerald-700">ODK : {form.odk_status}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/surveys/${surveyId}/questionnaire?form=${form.id}`} className="btn-secondary">Modifier</Link><button onClick={() => exportQuestionnaireWorkbook(form.title, form.definition?.questions || [])} className="btn-secondary"><Download className="mr-2 h-4" />XLSForm</button>{form.status === 'draft' && <button onClick={() => status(form, 'pending_endorsement')} className="btn-primary"><Send className="mr-2 h-4" />Soumettre</button>}{form.status === 'pending_endorsement' && <button onClick={() => status(form, 'endorsed')} className="btn-primary">Valider</button>}{form.status === 'endorsed' && <button onClick={() => setOdkForm(form)} className="btn-primary"><Database className="mr-2 h-4" />{form.odk_status === 'configured' ? 'Accès ODK' : 'Déployer sur ODK'}</button>}<button onClick={() => mutate('forms', 'DELETE', undefined, form.id)} className="rounded-md bg-red-50 px-3 text-red-700"><Trash2 className="h-4" /></button></div></div></article>)}</div> : <Empty text="Aucun questionnaire." />}</Panel>{odkForm && <OdkDeploymentDialog form={odkForm} mutate={mutate} onClose={() => setOdkForm(null)} setMessage={setMessage}/>}</div>;
}

async function odkSettingsPayload(configuration: Row, title: string) {
  const central = configuration.mode === 'central';
  const general: Row = {
    protocol: 'odk_default',
    server_url: central ? configuration.app_user_url : configuration.server_url,
    form_update_mode: 'match_exactly',
    autosend: 'wifi_and_cellular',
  };
  if (!central) {
    general.username = configuration.username;
    general.password = configuration.password;
  }
  const settings = {
    general,
    admin: { change_server: false },
    project: { name: title, icon: title.slice(0, 1).toUpperCase(), color: '#123d32' },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  compressed.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary);
}

function OdkDeploymentDialog({ form, mutate, onClose, setMessage }: { form: Row; mutate: any; onClose: () => void; setMessage: (value: string) => void }) {
  const existing = form.odk_configuration || {};
  const [mode, setMode] = useState<'central' | 'generic'>(existing.mode || 'central');
  const [configuration, setConfiguration] = useState<Row>(existing);
  const [qrValue, setQrValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const next: Row = { ...configuration, ...values, mode };
    if (mode === 'central' && !String(next.app_user_url || '').startsWith('https://')) return setMessage('L URL secrète de l App User ODK Central doit utiliser HTTPS.');
    if (mode === 'generic' && (!String(next.server_url || '').startsWith('https://') || !next.username || !next.password)) return setMessage('URL HTTPS, nom d utilisateur et mot de passe sont requis.');
    setBusy(true);
    const qr = await odkSettingsPayload(next, form.title);
    await mutate('forms', 'PATCH', {
      id: form.id,
      odk_status: 'configured',
      odk_configuration: next,
      odk_deployed_at: new Date().toISOString(),
    });
    setConfiguration(next);
    setQrValue(qr);
    setBusy(false);
    setMessage('Accès ODK Collect configuré. Le QR contient un secret et doit rester confidentiel.');
  }

  async function revealQr() {
    setQrValue(await odkSettingsPayload({ ...configuration, mode }, form.title));
  }

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4" onMouseDown={onClose}>
    <section className="mx-auto my-8 max-w-3xl bg-white p-7 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-emerald-700">Déploiement ODK Collect</p><h2 className="mt-1 text-2xl font-black">{form.title}</h2><p className="mt-2 text-sm text-slate-600">Téléchargez d abord le XLSForm et publiez-le dans le projet ODK Central. Configurez ensuite l accès de collecte ci-dessous.</p></div><button onClick={onClose} className="text-2xl" aria-label="Fermer">×</button></div>
      <div className="mt-6 inline-flex border bg-slate-50 p-1"><button onClick={() => setMode('central')} className={`px-4 py-2 text-sm font-bold ${mode === 'central' ? 'bg-forest text-white' : ''}`}>ODK Central recommandé</button><button onClick={() => setMode('generic')} className={`px-4 py-2 text-sm font-bold ${mode === 'generic' ? 'bg-forest text-white' : ''}`}>Serveur URL + identifiants</button></div>
      <form onSubmit={save} className="mt-5 grid gap-4">
        {mode === 'central' ? <>
          <label className="grid gap-2 text-sm font-bold">Adresse secrète de l’App User<input name="app_user_url" type="url" required defaultValue={configuration.app_user_url || ''} className="admin-input" placeholder="https://central.exemple.org/v1/key/..." /></label>
          <label className="grid gap-2 text-sm font-bold">Identifiant du projet Central<input name="project_id" defaultValue={configuration.project_id || ''} className="admin-input" placeholder="Ex. 12" /></label>
          <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">ODK Central n’utilise pas de nom d’utilisateur ni de mot de passe pour un App User. Son URL/QR secret remplit ce rôle.</p>
        </> : <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold md:col-span-2">Adresse URL du serveur<input name="server_url" type="url" required defaultValue={configuration.server_url || ''} className="admin-input" placeholder="https://odk.exemple.org" /></label>
          <label className="grid gap-2 text-sm font-bold">Nom d’utilisateur<input name="username" required defaultValue={configuration.username || ''} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Mot de passe / clé<input name="password" type="password" required defaultValue={configuration.password || ''} className="admin-input" /></label>
        </div>}
        <div className="flex flex-wrap gap-3"><button disabled={busy} className="btn-primary">{busy ? 'Configuration...' : 'Enregistrer et générer le QR'}</button><button type="button" onClick={() => exportQuestionnaireWorkbook(form.title, form.definition?.questions || [])} className="btn-secondary"><Download className="mr-2 h-4" />Télécharger le XLSForm</button>{existing.mode && !qrValue && <button type="button" onClick={revealQr} className="btn-secondary">Afficher le QR enregistré</button>}</div>
      </form>
      {qrValue && <div className="mt-7 grid gap-5 border-t pt-6 md:grid-cols-[220px_1fr]"><div className="bg-white p-3"><QRCode value={qrValue} size={196}/></div><div><h3 className="font-black">Configuration ODK Collect</h3><p className="mt-2 text-sm leading-6 text-slate-600">Dans ODK Collect, choisissez « Configurer avec un code QR » puis scannez ce code. Il contient les paramètres d’accès et doit être traité comme un mot de passe.</p><dl className="mt-4 grid gap-2 text-sm"><div><dt className="text-slate-500">URL</dt><dd className="break-all font-mono">{mode === 'central' ? configuration.app_user_url : configuration.server_url}</dd></div>{mode === 'generic' && <div><dt className="text-slate-500">Utilisateur</dt><dd className="font-mono">{configuration.username}</dd></div>}</dl></div></div>}
    </section>
  </div>;
}

function Collection({ forms, responses: allResponses, clusters, team, mutate, setMessage }: { forms: Row[]; responses: Row[]; clusters: Row[]; team: Row[]; mutate: any; setMessage: (value: string) => void }) {
  const endorsed = forms.filter(form => form.status === 'endorsed');
  const [formId, setFormId] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [villageCode, setVillageCode] = useState('');
  const [enumeratorId, setEnumeratorId] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const selectedForm = endorsed.find(form => form.id === formId);
  const responses = useMemo(() => {
    if (!selectedForm) return [];
    return allResponses.filter(response =>
      response.form_id === selectedForm.id
      || response.response_data?.form_id === selectedForm.id
      || response.response_data?.form_code === selectedForm.form_code
    );
  }, [allResponses, selectedForm]);
  const selectedCluster = clusters.find(cluster => cluster.id === clusterId);
  const selectedVillage = (selectedCluster?.villages || []).find((village: Row) => String(village.code) === villageCode);
  const selectedEnumerator = team.find(member => member.id === enumeratorId);
  const preview = clusterId && villageCode && enumeratorId
    ? `G-${selectedCluster?.cluster_code || '?'}-V-${villageCode}-E-${selectedEnumerator?.member_code || String(enumeratorId).slice(0, 6)}-Q-####`
    : 'Sélectionnez la grappe, le village/ZD et l’enquêteur.';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedForm || !selectedCluster || !selectedVillage || !selectedEnumerator) {
      setMessage('Questionnaire, grappe, village/ZD et enquêteur sont requis.');
      return;
    }
    const answers = Object.fromEntries(new FormData(event.currentTarget));
    delete answers.form_id;
    delete answers.cluster_id;
    delete answers.village_code;
    delete answers.enumerator_id;
    const item = await mutate('responses', 'POST', {
      source_type: 'local',
      form_id: selectedForm.id,
      cluster_id: selectedCluster.id,
      village_code: selectedVillage.code,
      village_name: selectedVillage.name,
      enumerator_id: selectedEnumerator.id,
      answers,
    });
    event.currentTarget.reset();
    setMessage(`Réponse enregistrée${item?.response_reference ? ` : ${item.response_reference}` : '.'}`);
  }

  async function importResponses(file?: File) {
    if (!file || !selectedForm) {
      setMessage('Choisissez d’abord un questionnaire validé puis un fichier.');
      return;
    }
    setImportBusy(true);
    const bytes = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const batch = Array.from(new Uint8Array(digest)).slice(0, 6).map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
    let importedRows: Row[];
    if (file.name.toLowerCase().endsWith('.csv')) {
      importedRows = Papa.parse<Row>(new TextDecoder().decode(bytes), { header: true, skipEmptyLines: true, dynamicTyping: true }).data;
    } else {
      const workbook = XLSX.read(bytes, { type: 'array' });
      importedRows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    }
    let imported = 0;
    for (let index = 0; index < importedRows.length; index += 1) {
      try {
        await mutate('responses', 'POST', {
          source_type: 'imported',
          import_batch: batch,
          source_row: index + 2,
          form_id: selectedForm.id,
          response_data: {
            form_id: selectedForm.id,
            form_code: selectedForm.form_code,
            source_file: file.name,
            answers: importedRows[index],
          },
        });
        imported += 1;
      } catch {
        // Stable references intentionally reject duplicate rows from the same file.
      }
    }
    setImportBusy(false);
    setMessage(`${imported}/${importedRows.length} ligne(s) importée(s). Lot ${batch}.`);
  }

  return <div className="grid gap-6">
    <Panel title="Collecte des données" text="Les références locales sont générées automatiquement et séquentiellement dans chaque village/ZD.">
      <div className="grid gap-3 md:grid-cols-4">
        <select value={formId} onChange={event => setFormId(event.target.value)} className="admin-input"><option value="">Questionnaire validé</option>{endorsed.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}</select>
        <select value={clusterId} onChange={event => { setClusterId(event.target.value); setVillageCode(''); }} className="admin-input"><option value="">Grappe</option>{clusters.map(cluster => <option key={cluster.id} value={cluster.id}>{cluster.cluster_code} - {cluster.cluster_name}</option>)}</select>
        <select value={villageCode} onChange={event => setVillageCode(event.target.value)} className="admin-input"><option value="">Village / ZD</option>{(selectedCluster?.villages || []).map((village: Row) => <option key={village.code} value={village.code}>{village.code} - {village.name}</option>)}</select>
        <select value={enumeratorId} onChange={event => setEnumeratorId(event.target.value)} className="admin-input"><option value="">Enquêteur</option>{team.filter(member => /enqu/i.test(member.role)).map(member => <option key={member.id} value={member.id}>{member.member_code || 'AUTO'} - {member.first_name} {member.last_name}</option>)}</select>
      </div>
      <p className="mt-3 rounded bg-emerald-50 p-3 font-mono text-sm font-bold text-emerald-900">{preview}</p>
      {selectedForm && <form onSubmit={submit} className="mt-6 grid max-w-4xl gap-4">
        {(selectedForm.definition?.questions || []).map((question: SurveyQuestion) => <QuestionField key={question.id} question={question} />)}
        <button className="btn-primary"><Save className="mr-2 h-4" />Enregistrer la réponse</button>
      </form>}
      <div className="mt-6 border-t pt-5">
        <h3 className="font-black">Importer des données externes</h3>
        <p className="mt-1 text-sm text-slate-500">Référence stable : IMP-[empreinte du fichier]-[numéro de ligne source]. L’identifiant original reste conservé dans les réponses.</p>
        <label className="btn-secondary mt-3 cursor-pointer"><FileSpreadsheet className="mr-2 h-4" />{importBusy ? 'Import en cours...' : 'Importer CSV / Excel'}<input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={importBusy} onChange={event => importResponses(event.target.files?.[0])} /></label>
      </div>
    </Panel>
    <Panel title={`${responses.length} réponse(s) collectée(s)`}>
      {responses.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Référence</th><th className="p-3">Source</th><th className="p-3">Village/ZD</th><th className="p-3">Formulaire</th><th className="p-3">Date</th></tr></thead><tbody>{responses.map(response => <tr key={response.id} className="border-t"><td className="p-3 font-mono font-bold">{response.response_reference || response.cluster_reference || '-'}</td><td className="p-3">{response.source_type || 'local'}</td><td className="p-3">{response.village_name || response.village_code || '-'}</td><td className="p-3">{response.response_data?.form_code || '-'}</td><td className="p-3">{new Date(response.submitted_at).toLocaleString('fr-FR')}</td></tr>)}</tbody></table></div> : <Empty text="Aucune donnée collectée." />}
    </Panel>
  </div>;
}

function CollectionLegacy({ forms, responses, mutate, setMessage }: { forms: Row[]; responses: Row[]; mutate: any; setMessage: (value: string) => void }) {
  const endorsed = forms.filter(form => form.status === 'endorsed');
  const [formId, setFormId] = useState('');
  const selected = endorsed.find(form => form.id === formId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; const data = Object.fromEntries(new FormData(event.currentTarget));
    await mutate('responses', 'POST', { cluster_reference: String(data.cluster_reference || ''), response_data: { form_id: selected.id, form_code: selected.form_code, answers: data } }); event.currentTarget.reset(); setMessage('Reponse enregistree.');
  }
  return <div className="grid gap-6"><Panel title="Collecte des donnees" text="Seuls les questionnaires valides sont deployables."><select value={formId} onChange={event => setFormId(event.target.value)} className="admin-input max-w-xl"><option value="">Choisir un questionnaire valide</option>{endorsed.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}</select>{selected && <form onSubmit={submit} className="mt-6 grid max-w-3xl gap-4"><label className="grid gap-2 text-sm font-bold">Reference grappe / menage<input name="cluster_reference" className="admin-input" /></label>{(selected.definition?.questions || []).map((question: SurveyQuestion) => <QuestionField key={question.id} question={question} />)}<button className="btn-primary"><Save className="mr-2 h-4" />Enregistrer la reponse</button></form>}</Panel><Panel title={`${responses.length} reponse(s) collectee(s)`}>{responses.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Reference</th><th className="p-3">Formulaire</th><th className="p-3">Date</th></tr></thead><tbody>{responses.map(response => <tr key={response.id} className="border-t"><td className="p-3 font-bold">{response.cluster_reference || '-'}</td><td className="p-3">{response.response_data?.form_code || '-'}</td><td className="p-3">{new Date(response.submitted_at).toLocaleString('fr-FR')}</td></tr>)}</tbody></table></div> : <Empty text="Aucune donnee collectee." />}</Panel></div>;
}

function QuestionField({ question }: { question: SurveyQuestion }) {
  if (question.type === 'end_group' || question.type === 'end_repeat') return null;
  if (question.type === 'note') return <p className="rounded-md bg-slate-50 p-4 text-sm">{question.label}</p>;
  if (question.type === 'begin_group' || question.type === 'begin_repeat') return <h3 className="border-b pb-2 text-lg font-black">{question.label}</h3>;
  if (question.type === 'calculate') return null;
  if (question.type === 'select_one') return <label className="grid gap-2 text-sm font-bold">{question.label}<select name={question.name} required={question.required} className="admin-input"><option value="">Selectionner</option>{question.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  if (question.type === 'select_multiple') return <fieldset className="rounded-md border p-4"><legend className="px-2 text-sm font-bold">{question.label}</legend>{question.options?.map(option => <label key={option.value} className="mr-4 inline-flex gap-2 text-sm"><input type="checkbox" name={`${question.name}_${option.value}`} value="yes" />{option.label}</label>)}</fieldset>;
  return <label className="grid gap-2 text-sm font-bold">{question.label}<input name={question.name} type={question.type === 'integer' || question.type === 'decimal' ? 'number' : question.type === 'date' ? 'date' : question.type === 'time' ? 'time' : 'text'} step={question.type === 'decimal' ? 'any' : undefined} required={question.required} readOnly={question.readonly} placeholder={question.hints?.fr} className="admin-input" /></label>;
}

function Analysis({ survey, forms, responses, mutate, setMessage }: { survey: Row; forms: Row[]; responses: Row[]; mutate: any; setMessage: (value: string) => void }) {
  const variables = new Set<string>();
  responses.forEach(response => Object.keys(response.response_data?.answers || {}).forEach(key => variables.add(key)));
  const references = responses.map(response => response.response_reference || response.cluster_reference || response.id);
  const duplicateCount = references.length - new Set(references).size;
  const paths = [
    {
      href: `/surveys/${survey.id}/analysis/anthropometrie`,
      title: 'Analyse des données anthropométriques nutritionnelles',
      text: 'Correspondance des variables, z-scores OMS, vue ENA, contrôle global et rapports filtrés.',
      icon: Activity,
    },
    {
      href: `/surveys/${survey.id}/analysis/modules-avances`,
      title: 'Analyse des modules avancés',
      text: 'FCS/FCS-N, HDDS, HHS, rCSI et autres modules avec création de variables calculées.',
      icon: FlaskConical,
    },
    {
      href: `/surveys/${survey.id}/analysis/autres-analyses`,
      title: 'Autres analyses',
      text: 'Recodage, qualité, nettoyage, distributions, tests statistiques, modèles et graphiques.',
      icon: BarChart3,
    },
  ];
  return <div className="grid gap-6">
    <Panel title="Données disponibles pour l’analyse" text="Les pages d’analyse permettront de choisir précisément un questionnaire de l’enquête ou un fichier externe.">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Observations" value={responses.length} />
        <Metric label="Variables repérées" value={variables.size} />
        <Metric label="Questionnaires" value={forms.length} />
        <Metric label="Références en doublon" value={duplicateCount} />
      </div>
    </Panel>
    <Panel title="Moteur d’analyse des données" text="Choisissez un parcours. Chaque espace utilise uniquement la base active de l’enquête ou le fichier que vous importez.">
      <div className="grid gap-4 xl:grid-cols-3">
        {paths.map(({ href, title, text, icon: Icon }) => <Link key={href} href={href} className="group border bg-white p-6 transition hover:border-emerald-600 hover:shadow-md">
          <Icon className="h-8 w-8 text-emerald-700" />
          <h3 className="mt-5 text-lg font-black text-forest">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
          <span className="mt-5 inline-flex text-sm font-black text-emerald-700">Ouvrir l’analyse</span>
        </Link>)}
      </div>
    </Panel>
  </div>;
}

function AnalysisLegacy({ survey, mutate, setMessage }: { survey: Row; mutate: any; setMessage: (value: string) => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [mapping, setMapping] = useState({ age: '', sex: '', weight: '', height: '' });
  const [nutrition, setNutrition] = useState<Row | null>(null);
  const [ai, setAi] = useState<Row | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const analysis = useMemo(() => rows.length ? analyzeDataset(rows) : null, [rows]);
  const standardizedIndicators = useMemo(
    () => rows.map((row, index) => ({ row: index + 1, ...calculateSurveyIndicators(row) })),
    [rows],
  );
  const table = first && second ? crossTab(rows, first, second) : null;
  async function load(file?: File) {
    if (!file) return; setFileName(file.name);
    if (file.name.toLowerCase().endsWith('.csv')) {
      const parsed = Papa.parse<Record<string, unknown>>(await file.text(), { header: true, skipEmptyLines: true, dynamicTyping: true });
      setRows(parsed.data);
    } else {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]];
      setRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }));
    }
  }
  async function saveReport() {
    if (!analysis) return;
    await mutate('reports', 'POST', { title: `Analyse ${survey.title} - ${new Date().toLocaleDateString('fr-FR')}`, report_type: 'data_quality', source_file_name: fileName, dataset_summary: { rows: analysis.rowCount, columns: analysis.columnCount }, quality_report: analysis, analysis_results: { cross_tab: table, nutritional_status: nutrition, standardized_indicators: standardizedIndicators }, ai_interpretation: ai || {} });
    setMessage('Analyse ajoutee au rapport de l enquete.');
  }
  function calculateNutrition() {
    if (!mapping.sex || !mapping.weight || !mapping.height) return setMessage('Selectionnez au minimum le sexe, le poids et la taille.');
    const calculated = rows.map(row => {
      const sex = row[mapping.sex]; const weight = Number(row[mapping.weight]); const height = Number(row[mapping.height]); const age = Number(row[mapping.age]);
      const whz = calculateWFLzScore(height, weight, sex);
      const haz = mapping.age ? calculateLFAzScore(age, height, sex) : null;
      const waz = mapping.age ? calculateWFAzScore(age, weight, sex) : null;
      return { whz, whzCategory: classifyWFLzScore(whz), haz, hazCategory: classifyLFAzScore(haz), waz };
    });
    const valid = calculated.filter(item => item.whz !== null);
    const plausibility = analyzeEnaSmartPlausibility(rows, mapping);
    setNutrition({
      valid: valid.length,
      wasting: valid.filter(item => Number(item.whz) < -2).length,
      severeWasting: valid.filter(item => Number(item.whz) < -3).length,
      stunting: calculated.filter(item => item.haz !== null && Number(item.haz) < -2).length,
      severeStunting: calculated.filter(item => item.haz !== null && Number(item.haz) < -3).length,
      underweight: calculated.filter(item => item.waz !== null && Number(item.waz) < -2).length,
      enaSmartPlausibility: plausibility,
    });
  }
  async function generateAi() {
    if (!analysis) return; setAiBusy(true);
    const response = await fetch(`/api/surveys/${survey.id}/ai-analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: { rows: analysis.rowCount, columns: analysis.columnCount }, quality: analysis, nutritionalStatus: nutrition, enaSmartPlausibility: nutrition?.enaSmartPlausibility, crossTab: table }) });
    const result = await response.json(); setAiBusy(false);
    if (response.ok) setAi(result.analysis); else setMessage(result.message || 'Analyse IA impossible.');
  }
  const columns = Object.keys(rows[0] || {});
  return <div className="grid gap-6"><Panel title="Module d analyse" text="Chargez un fichier CSV ou Excel pour les controles de qualite, analyses univariees et croisees."><label className="btn-primary cursor-pointer"><FileSpreadsheet className="mr-2 h-4" />Charger les donnees<input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={event => load(event.target.files?.[0])} /></label>{analysis && <div className="mt-6 grid gap-4 sm:grid-cols-4"><Metric label="Lignes" value={analysis.rowCount} /><Metric label="Variables" value={analysis.columnCount} /><Metric label="Completude" value={`${analysis.completeness}%`} /><Metric label="Doublons" value={analysis.duplicateRows} /></div>}</Panel>{analysis && <><Panel title="Qualite et plausibilite" text="Statistiques descriptives et donnees manquantes par variable."><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Variable</th><th className="p-3">Manquants</th><th className="p-3">Uniques</th><th className="p-3">Moyenne</th><th className="p-3">ET</th><th className="p-3">Min-Max</th></tr></thead><tbody>{analysis.columns.map(column => <tr key={column.name} className="border-t"><td className="p-3 font-mono text-xs">{column.name}</td><td className="p-3">{column.missing}</td><td className="p-3">{column.unique}</td><td className="p-3">{column.mean?.toFixed(2) || '-'}</td><td className="p-3">{column.standardDeviation?.toFixed(2) || '-'}</td><td className="p-3">{column.numeric ? `${column.min} - ${column.max}` : '-'}</td></tr>)}</tbody></table></div></Panel><Panel title="Statut nutritionnel OMS" text="Associez les colonnes anthropometriques pour calculer WHZ, HAZ et WAZ."><div className="grid gap-3 md:grid-cols-4">{(['age','sex','weight','height'] as const).map(key => <select key={key} value={mapping[key]} onChange={event => setMapping(current => ({ ...current, [key]: event.target.value }))} className="admin-input"><option value="">{key === 'age' ? 'Age en mois' : key === 'sex' ? 'Sexe' : key === 'weight' ? 'Poids kg' : 'Taille cm'}</option>{columns.map(column => <option key={column}>{column}</option>)}</select>)}</div><button onClick={calculateNutrition} className="btn-secondary mt-4">Calculer les indicateurs</button>{nutrition && <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Emaciation" value={nutrition.wasting} /><Metric label="Emaciation severe" value={nutrition.severeWasting} /><Metric label="Retard de croissance" value={nutrition.stunting} /><Metric label="Retard severe" value={nutrition.severeStunting} /><Metric label="Insuffisance ponderale" value={nutrition.underweight} /><Metric label="Observations valides" value={nutrition.valid} /></div>}</Panel><Panel title="Analyse bivariee" text="Croisez deux variables pour produire un tableau de contingence."><div className="flex flex-wrap gap-3"><select value={first} onChange={event => setFirst(event.target.value)} className="admin-input"><option value="">Variable 1</option>{columns.map(column => <option key={column}>{column}</option>)}</select><select value={second} onChange={event => setSecond(event.target.value)} className="admin-input"><option value="">Variable 2</option>{columns.map(column => <option key={column}>{column}</option>)}</select></div>{table && <pre className="mt-5 max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-emerald-100">{JSON.stringify(table, null, 2)}</pre>}</Panel><Panel title="Interpretation assistee par IA" text="Synthese des constats, limites et recommandations a partir des resultats agreges."><button onClick={generateAi} disabled={aiBusy} className="btn-primary">{aiBusy ? 'Analyse...' : 'Generer l interpretation'}</button>{ai && <div className="mt-5 grid gap-4"><p className="leading-7">{ai.summary}</p>{['findings','limitations','recommendations'].map(section => <div key={section}><h3 className="font-black capitalize">{section}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{(ai[section] || []).map((item: string) => <li key={item}>{item}</li>)}</ul></div>)}</div>}<button onClick={saveReport} className="btn-secondary mt-5"><Save className="mr-2 h-4" />Ajouter au rapport</button></Panel></>}</div>;
}

function Reports({ surveyId, reports }: { surveyId: string; reports: Row[] }) {
  return <Panel title="Constructeur de rapports" text="Analyses sauvegardees, historique et elements a inclure dans la restitution finale." actions={<a href={`/api/surveys/${surveyId}/report`} className="btn-primary"><Download className="mr-2 h-4" />Telecharger le PDF</a>}>{reports.length ? <div className="grid gap-4">{reports.map(report => <article key={report.id} className="rounded-md border p-5"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">{report.report_type}</p><h3 className="mt-2 font-black">{report.title}</h3><p className="mt-2 text-sm text-slate-500">{report.source_file_name || 'Donnees collectees dans la plateforme'} · {new Date(report.created_at).toLocaleString('fr-FR')}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Lignes" value={report.dataset_summary?.rows || '-'} /><Metric label="Variables" value={report.dataset_summary?.columns || '-'} /><Metric label="Completude" value={`${report.quality_report?.completeness || 0}%`} /></div>{report.ai_interpretation?.summary && <p className="mt-4 border-l-4 border-emerald-500 pl-4 text-sm leading-6">{report.ai_interpretation.summary}</p>}</article>)}</div> : <Empty text="Aucune analyse sauvegardee dans le rapport." />}</Panel>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-forest">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500"><Activity className="mx-auto mb-3 h-7 text-slate-300" />{text}</div>;
}
