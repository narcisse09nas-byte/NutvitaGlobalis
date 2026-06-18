"use client";

import {useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {applicationStatuses,documentFields,type ApplicationStatus} from "@/lib/recruitment-data";

type Row=Record<string,any>;
const actions:[ApplicationStatus,string][]=[
  ["under_review","Mettre en analyse"],
  ["incomplete","Marquer incomplet"],
  ["preselected","Preselectionner"],
  ["invited_to_test","Inviter au test ecrit"],
  ["invited_to_interview","Inviter a l'entretien"],
  ["interview_completed","Entretien termine"],
  ["selected","Retenir"],
  ["rejected","Rejeter"],
  ["integrated","Integrer au reseau"],
];

export default function RecruitmentManager({initial,questions}:{initial:Row[];questions:Row[]}){
  const [rows,setRows]=useState(initial);
  const [selected,setSelected]=useState<Row|null>(null);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("");
  const [note,setNote]=useState("");
  const [message,setMessage]=useState("");
  const [history,setHistory]=useState<Row[]>([]);
  const supabase=useMemo(()=>createClient(),[]);
  const filtered=useMemo(()=>rows.filter(r=>[r.full_name,r.country,r.city,r.specialization,r.status].join(" ").toLowerCase().includes(query.toLowerCase())&&(!status||r.status===status)),[rows,query,status]);
  const testsToReview=useMemo(()=>rows.filter(row=>row.recruitment_test_attempts?.some((attempt:Row)=>["submitted","expired","graded"].includes(attempt.status))),[rows]);

  async function open(row:Row){
    setSelected(row);
    setNote("");
    const {data}=await supabase.from("recruitment_history").select("*").eq("application_id",row.id).order("created_at",{ascending:false});
    setHistory(data||[]);
  }

  async function openDocument(path:string){
    const {data,error}=await supabase.storage.from("recruitment-documents").createSignedUrl(path,300);
    if(error)setMessage(error.message);
    else window.open(data.signedUrl,"_blank");
  }

  async function act(next:ApplicationStatus,notify=true){
    if(!selected)return;
    if(notify&&!confirm(`Confirmer l'action "${applicationStatuses[next]}" ?`))return;
    setMessage("Enregistrement...");
    const attempt=selected.recruitment_test_attempts?.[0];
    const response=await fetch("/api/recruitment/admin-action",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        id:selected.id,
        status:next,
        note,
        notify,
        internal_comments:selected.internal_comments,
        administrative_score:selected.administrative_score,
        manual_score:attempt?.manual_score,
        reviewer_comments:attempt?.reviewer_comments,
      }),
    });
    const result=await response.json();
    if(!response.ok){
      setMessage(result.message);
      return;
    }
    const updated:Row={...selected,status:next};
    setRows(rows.map(r=>r.id===updated.id?updated:r));
    setSelected(updated);
    setMessage(notify?"Statut mis a jour et notification envoyee.":"Evaluation enregistree.");
    open(updated);
  }

  function update(name:string,value:unknown){
    setSelected(s=>s?{...s,[name]:value}:s);
  }

  const docs=(selected?.documents||{}) as Record<string,Array<{name:string;path:string}>>;
  const attempt=selected?.recruitment_test_attempts?.[0];

  return <div>
    <section className="mb-8 rounded-3xl border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange">Correction</p>
          <h2 className="mt-2 text-2xl font-black">Tests ecrits a corriger</h2>
          <p className="mt-2 text-sm text-slate-500">Ouvrez un candidat, lisez ses reponses, attribuez une note de correction (%) puis cliquez sur "Enregistrer l'evaluation".</p>
        </div>
        <span className="rounded-full bg-orange/10 px-4 py-2 text-sm font-black text-orange">{testsToReview.length} dossier(s)</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {testsToReview.map(row=>{
          const attempt=row.recruitment_test_attempts?.[0]||{};
          return <button key={row.id} onClick={()=>open(row)} className="rounded-2xl bg-slate-50 p-4 text-left hover:bg-mint">
            <b className="text-forest">{row.full_name||row.email}</b>
            <p className="mt-1 text-sm text-slate-500">Statut test : {attempt.status} - Score QCM : {formatScore(attempt.automatic_score)}%</p>
            <p className="mt-1 text-xs text-slate-400">Note correction : {attempt.manual_score??"non attribuee"}%</p>
          </button>;
        })}
        {!testsToReview.length&&<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2">Aucun test soumis a corriger pour le moment.</p>}
      </div>
    </section>
    <div className="mb-6 grid gap-3 md:grid-cols-[1fr_240px]">
      <input className="admin-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher nom, pays, ville, specialite..."/>
      <select className="admin-input" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">Tous les statuts</option>
        {Object.entries(applicationStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    {message&&<p className="mb-4 rounded-xl bg-mint p-4 text-sm font-bold text-forest">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[850px] text-left">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Candidat</th><th className="p-4">Localisation</th><th className="p-4">Specialite</th><th className="p-4">Statut</th><th/></tr></thead>
        <tbody>
          {filtered.map(row=><tr key={row.id} className="border-b">
            <td className="p-4"><b className="text-forest">{row.full_name||"Sans nom"}</b><p className="text-xs text-slate-400">{row.email}</p></td>
            <td className="p-4">{row.city}, {row.country}</td>
            <td className="p-4">{row.specialization}</td>
            <td className="p-4"><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-leaf">{applicationStatuses[row.status as ApplicationStatus]}</span></td>
            <td className="p-4 text-right"><button onClick={()=>open(row)} className="font-bold text-leaf">Examiner</button></td>
          </tr>)}
          {!filtered.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucune candidature.</td></tr>}
        </tbody>
      </table>
    </div>

    {selected&&<div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4">
      <div className="mx-auto my-5 max-w-5xl rounded-3xl bg-white p-6 md:p-9">
        <div className="flex items-start justify-between">
          <div><h2 className="text-3xl font-black">{selected.full_name}</h2><p className="mt-1 text-slate-500">{selected.professional_title} - {selected.specialization}</p></div>
          <button onClick={()=>setSelected(null)} className="text-3xl">x</button>
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <Info title="Informations" values={[
            ["Naissance",selected.birth_date],
            ["Localisation",`${selected.city}, ${selected.country}`],
            ["WhatsApp",selected.whatsapp_phone],
            ["Email",selected.email],
            ["Diplome",selected.highest_degree],
            ["Experience",`${selected.years_experience||0} ans`],
            ["Langues",selected.languages?.join(", ")],
            ["Disponibilite (heures)",selected.weekly_availability],
            ["Tarif",`${selected.desired_rate||0} FCFA`],
            ["Domaines",selected.intervention_domains?.join(", ")],
          ]}/>
          <section className="rounded-2xl bg-slate-50 p-5">
            <h3 className="text-xl font-black">Documents</h3>
            <div className="mt-4 grid gap-3">{documentFields.map(([key,label])=><div key={key}>
              <b className="text-sm">{label}</b>
              {(docs[key]||[]).map(file=><button key={file.path} onClick={()=>openDocument(file.path)} className="ml-3 text-sm font-bold text-leaf">{file.name}</button>)}
            </div>)}</div>
          </section>

          {attempt&&<section className="rounded-2xl bg-slate-50 p-5 lg:col-span-2">
            <h3 className="text-xl font-black">Test ecrit</h3>
            <p className="mt-3">Score QCM automatique : <b>{formatScore(attempt.automatic_score)}%</b> - Statut : {attempt.status}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">Note de correction (%)
                <input type="number" min="0" max="100" className="admin-input" value={attempt.manual_score??""} onChange={e=>setSelected({...selected,recruitment_test_attempts:[{...attempt,manual_score:e.target.value===""?null:Number(e.target.value)}]})}/>
              </label>
              <label className="grid gap-2 text-sm font-bold">Commentaires de correction
                <textarea className="admin-input" value={attempt.reviewer_comments||""} onChange={e=>setSelected({...selected,recruitment_test_attempts:[{...attempt,reviewer_comments:e.target.value}]})}/>
              </label>
            </div>
            <div className="mt-5 grid gap-3">{questions.map(question=><div key={question.id} className="rounded-xl bg-white p-4">
              <b>{question.prompt}</b>
              <AnswerDisplay value={attempt.answers?.[question.id]} openDocument={openDocument}/>
            </div>)}</div>
          </section>}

          <section className="rounded-2xl border p-5 lg:col-span-2">
            <h3 className="text-xl font-black">Evaluation interne</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">Note administrative (%)
                <input type="number" min="0" max="100" className="admin-input" value={selected.administrative_score??""} onChange={e=>update("administrative_score",e.target.value===""?null:Number(e.target.value))}/>
              </label>
              <label className="grid gap-2 text-sm font-bold">Commentaire interne
                <textarea className="admin-input" value={selected.internal_comments||""} onChange={e=>update("internal_comments",e.target.value)}/>
              </label>
            </div>
            <button onClick={()=>act(selected.status as ApplicationStatus,false)} className="btn-secondary mt-4">Enregistrer l'evaluation</button>
            <label className="mt-5 grid gap-2 text-sm font-bold">Message envoye au candidat
              <textarea className="admin-input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Precisions, lien d'entretien, documents manquants..."/>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">{actions.map(([value,label])=><button key={value} onClick={()=>act(value)} className={value==="rejected"?"rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white":"btn-secondary px-4 py-2"}>{label}</button>)}</div>
          </section>

          <section className="lg:col-span-2">
            <h3 className="text-xl font-black">Historique des decisions</h3>
            <div className="mt-3 grid gap-2">{history.map(item=><div key={item.id} className="rounded-xl bg-slate-50 p-4 text-sm">
              <b>{item.action}</b><span className="ml-3 text-slate-400">{new Date(item.created_at).toLocaleString("fr-FR")}</span>{item.note&&<p className="mt-1">{item.note}</p>}
            </div>)}</div>
          </section>
        </div>
      </div>
    </div>}
  </div>;
}

function AnswerDisplay({value,openDocument}:{value:any;openDocument:(path:string)=>void}){
  if(value===undefined||value===null||value==="")return <p className="mt-2 text-sm text-slate-400">Sans reponse</p>;
  if(Array.isArray(value))return <ul className="mt-2 list-disc pl-5 text-sm">{value.map((item,index)=><li key={`${item}-${index}`}>{String(item)}</li>)}</ul>;
  if(typeof value==="object"&&value.path){
    return <button onClick={()=>openDocument(value.path)} className="mt-2 text-sm font-bold text-leaf">{value.name||"Fichier joint"}</button>;
  }
  if(typeof value==="object")return <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-3 text-xs">{JSON.stringify(value,null,2)}</pre>;
  return <p className="mt-2 whitespace-pre-wrap text-sm">{String(value)}</p>;
}

function Info({title,values}:{title:string;values:Array<[string,unknown]>}){
  return <section className="rounded-2xl bg-slate-50 p-5">
    <h3 className="text-xl font-black">{title}</h3>
    <dl className="mt-4 grid gap-3">{values.map(([key,value])=><div key={key}><dt className="text-xs font-bold uppercase text-slate-400">{key}</dt><dd>{String(value||"-")}</dd></div>)}</dl>
  </section>;
}

function formatScore(value:any){
  const score=Number(value||0);
  return Number.isInteger(score)?String(score):score.toFixed(2);
}
