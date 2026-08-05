"use client";

import {useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Row=Record<string,any>;
type Settings={
  id:number;
  title:string;
  instructions:string;
  available_from:string|null;
  available_until:string|null;
  duration_minutes:number;
  camera_required:boolean;
  active:boolean;
};

const questionTypes=[
  ["qcm","QCM - une seule reponse"],
  ["multi_qcm","QCM - plusieurs reponses"],
  ["open","Question ouverte"],
  ["case_study","Cas pratique"],
  ["file_upload","Travail avec fichier joint"],
] as const;

const emptyQuestion={
  category:"nutrition",
  question_type:"open",
  job_offer_id:"",
  prompt:"",
  options:"",
  correct_answer:"",
  points:10,
  position:1,
  allow_external_window:false,
  file_instructions:"",
  max_files:1,
  active:true,
};

const emptyExamRequest={job_offer_id:"",title:"",qcm_count:5,multi_qcm_count:0,case_study_count:1,open_count:0,file_upload_count:0};

export default function TestConfigManager({initialSettings,initialQuestions,candidates,jobOffers,initialExams}:{initialSettings:Settings|null;initialQuestions:Row[];candidates:Row[];jobOffers:Row[];initialExams:Row[]}){
  const [settings,setSettings]=useState<Settings>(initialSettings||{id:1,title:"Test ecrit NutVitaGlobalis",instructions:"Lisez attentivement chaque question avant de repondre.",available_from:null,available_until:null,duration_minutes:60,camera_required:false,active:true});
  const [questions,setQuestions]=useState<Row[]>(initialQuestions);
  const [draft,setDraft]=useState<Row>(emptyQuestion);
  const [selectedCandidates,setSelectedCandidates]=useState<string[]>([]);
  const [message,setMessage]=useState("");
  const [examRequest,setExamRequest]=useState(emptyExamRequest);
  const [exams,setExams]=useState<Row[]>(initialExams);
  const [generating,setGenerating]=useState(false);
  const supabase=useMemo(()=>createClient(),[]);
  const isChoiceQuestion=draft.question_type==="qcm"||draft.question_type==="multi_qcm";
  const isFileQuestion=draft.question_type==="file_upload";
  const jobOfferLabel=(id:string)=>jobOffers.find(offer=>offer.id===id)?.title||"Poste inconnu";

  async function generateExam(){
    if(!examRequest.job_offer_id){setMessage("Selectionnez un poste avant de generer l'epreuve.");return}
    setGenerating(true);setMessage("Generation de l'epreuve...");
    const {data,error}=await supabase.rpc("generate_recruitment_exam",{
      p_job_offer_id:examRequest.job_offer_id,
      p_title:examRequest.title,
      p_qcm_count:Number(examRequest.qcm_count||0),
      p_multi_qcm_count:Number(examRequest.multi_qcm_count||0),
      p_case_study_count:Number(examRequest.case_study_count||0),
      p_open_count:Number(examRequest.open_count||0),
      p_file_upload_count:Number(examRequest.file_upload_count||0),
    });
    setGenerating(false);
    if(error){setMessage(error.message);return}
    const {data:exam}=await supabase.from("recruitment_generated_exams").select("*").eq("id",data).single();
    if(exam)setExams([exam,...exams.map(item=>item.job_offer_id===exam.job_offer_id?{...item,active:false}:item)]);
    setMessage("Epreuve generee et activee pour ce poste.");
  }

  async function saveSettings(){
    setMessage("Enregistrement...");
    const {error}=await supabase.from("recruitment_test_settings").upsert({
      id:1,
      title:settings.title,
      instructions:settings.instructions,
      available_from:settings.available_from||null,
      available_until:settings.available_until||null,
      duration_minutes:Number(settings.duration_minutes),
      camera_required:Boolean(settings.camera_required),
      active:Boolean(settings.active),
    });
    setMessage(error?error.message:"Parametres du test enregistres.");
    return !error;
  }

  async function addQuestion(){
    if(!String(draft.prompt||"").trim()){
      setMessage("Veuillez saisir l'enonce de la question.");
      return;
    }
    setMessage("Ajout de la question...");
    const options=String(draft.options||"").split("\n").map(v=>v.trim()).filter(Boolean);
    const {data,error}=await supabase.from("recruitment_test_questions").insert({
      category:draft.category||"nutrition",
      question_type:draft.question_type,
      job_offer_id:draft.job_offer_id||null,
      prompt:draft.prompt,
      options:options.length?options:null,
      correct_answer:draft.correct_answer||null,
      points:Number(draft.points||0),
      position:Number(draft.position||questions.length+1),
      allow_external_window:Boolean(draft.allow_external_window),
      file_instructions:draft.file_instructions||null,
      max_files:Number(draft.max_files||1),
      active:Boolean(draft.active),
    }).select("*").single();
    if(error){
      setMessage(error.message);
      return;
    }
    setQuestions([...questions,data]);
    setDraft({...emptyQuestion,position:questions.length+2});
    setMessage("Question ajoutee.");
  }

  async function toggleQuestion(question:Row){
    const {data,error}=await supabase.from("recruitment_test_questions").update({active:!question.active}).eq("id",question.id).select("*").single();
    if(error){
      setMessage(error.message);
      return;
    }
    setQuestions(questions.map(q=>q.id===question.id?data:q));
  }

  function toggleCandidate(id:string){
    setSelectedCandidates(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  }

  async function sendTest(){
    if(!selectedCandidates.length){
      setMessage("Selectionnez au moins un candidat.");
      return;
    }
    if(!settings.active){
      setMessage("Activez le test avant l'envoi aux candidats.");
      return;
    }
    if(!questions.some(question=>question.active)){
      setMessage("Ajoutez au moins une question active avant l'envoi.");
      return;
    }
    const saved=await saveSettings();
    if(!saved)return;
    setMessage("Envoi du test aux candidats selectionnes...");
    const response=await fetch("/api/recruitment/send-test",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({candidate_ids:selectedCandidates}),
    });
    const result=await response.json();
    if(!response.ok){
      setMessage(result.message||"Envoi impossible.");
      return;
    }
    setSelectedCandidates([]);
    setMessage(`Test envoye a ${result.count} candidat(s). Il est maintenant visible dans leur espace candidat.`);
  }

  return <section className="mb-8 rounded-3xl border bg-white p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-leaf">Epreuve ecrite</p>
        <h2 className="mt-2 text-2xl font-black">Configuration du test candidat</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Definissez la periode, la duree, la surveillance camera et les questions. Les notes administratives et de correction sont exprimees en pourcentage.</p>
      </div>
      {message&&<p className="rounded-xl bg-mint px-4 py-3 text-sm font-bold text-forest">{message}</p>}
    </div>

    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">Titre du test
        <input className="admin-input" value={settings.title} onChange={e=>setSettings({...settings,title:e.target.value})}/>
      </label>
      <label className="grid gap-2 text-sm font-bold">Duree autorisee (minutes)
        <input className="admin-input" type="number" min={5} max={240} value={settings.duration_minutes} onChange={e=>setSettings({...settings,duration_minutes:Number(e.target.value)})}/>
      </label>
      <label className="grid gap-2 text-sm font-bold">Ouverture
        <input className="admin-input" type="datetime-local" value={toLocalInput(settings.available_from)} onChange={e=>setSettings({...settings,available_from:fromLocalInput(e.target.value)})}/>
      </label>
      <label className="grid gap-2 text-sm font-bold">Fermeture
        <input className="admin-input" type="datetime-local" value={toLocalInput(settings.available_until)} onChange={e=>setSettings({...settings,available_until:fromLocalInput(e.target.value)})}/>
      </label>
      <label className="grid gap-2 text-sm font-bold lg:col-span-2">Instructions
        <textarea className="admin-input min-h-28" value={settings.instructions} onChange={e=>setSettings({...settings,instructions:e.target.value})}/>
      </label>
      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
        <input type="checkbox" checked={settings.camera_required} onChange={e=>setSettings({...settings,camera_required:e.target.checked})}/>
        Demander l'activation de la camera avant le test
      </label>
      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
        <input type="checkbox" checked={settings.active} onChange={e=>setSettings({...settings,active:e.target.checked})}/>
        Test actif pour les candidats invites
      </label>
    </div>
    <button onClick={saveSettings} className="btn-primary mt-5">Enregistrer les parametres</button>

    <div className="mt-8 border-t pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">Candidats invites au test</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Cochez un ou plusieurs candidats, puis envoyez le test. Le statut passera a "Invite au test ecrit" et le test apparaitra directement dans leur espace candidat.</p>
        </div>
        <button onClick={sendTest} className="btn-primary">Envoyer le test</button>
      </div>
      <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto rounded-2xl border bg-slate-50 p-3">
        {candidates.map(candidate=><label key={candidate.id} className="flex items-start gap-3 rounded-xl bg-white p-4 text-sm">
          <input type="checkbox" className="mt-1" checked={selectedCandidates.includes(candidate.id)} onChange={()=>toggleCandidate(candidate.id)}/>
          <span>
            <b className="text-forest">{candidate.full_name||candidate.email}</b>
            <span className="ml-2 rounded-full bg-mint px-2 py-1 text-xs font-bold text-leaf">{candidate.status}</span>
            <p className="mt-1 text-xs text-slate-500">{[candidate.specialization,candidate.city,candidate.country].filter(Boolean).join(" - ")}</p>
          </span>
        </label>)}
        {!candidates.length&&<p className="rounded-xl bg-white p-5 text-sm text-slate-500">Aucun candidat eligible pour le test.</p>}
      </div>
    </div>

    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-black">Ajouter une question</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">Categorie
          <input className="admin-input" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Poste (offre d'emploi)
          <select className="admin-input" value={draft.job_offer_id} onChange={e=>setDraft({...draft,job_offer_id:e.target.value})}>
            <option value="">Generique (tous postes)</option>
            {jobOffers.map(offer=><option key={offer.id} value={offer.id}>{offer.title}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">Type
          <select className="admin-input" value={draft.question_type} onChange={e=>setDraft({...draft,question_type:e.target.value,options:"",correct_answer:"",file_instructions:"",allow_external_window:false,max_files:1})}>
            {questionTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold lg:col-span-2">Enonce
          <textarea className="admin-input min-h-24" value={draft.prompt} onChange={e=>setDraft({...draft,prompt:e.target.value})}/>
        </label>
        {isChoiceQuestion&&<>
          <label className="grid gap-2 text-sm font-bold">Options QCM, une par ligne
            <textarea className="admin-input min-h-24" value={draft.options} onChange={e=>setDraft({...draft,options:e.target.value})}/>
          </label>
          <label className="grid gap-2 text-sm font-bold">Bonne reponse QCM
            <input className="admin-input" value={draft.correct_answer} onChange={e=>setDraft({...draft,correct_answer:e.target.value})} placeholder={draft.question_type==="multi_qcm"?"Reponses exactes separees par des virgules":"Identique a l'option exacte"}/>
          </label>
        </>}
        <label className="grid gap-2 text-sm font-bold">Points
          <input className="admin-input" type="number" value={draft.points} onChange={e=>setDraft({...draft,points:Number(e.target.value)})}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Position
          <input className="admin-input" type="number" value={draft.position} onChange={e=>setDraft({...draft,position:Number(e.target.value)})}/>
        </label>
        {isFileQuestion&&<>
          <label className="grid gap-2 text-sm font-bold">Nombre maximum de fichiers
            <input className="admin-input" type="number" min={1} max={5} value={draft.max_files} onChange={e=>setDraft({...draft,max_files:Number(e.target.value)})}/>
          </label>
          <label className="grid gap-2 text-sm font-bold lg:col-span-2">Instructions fichier
            <textarea className="admin-input" value={draft.file_instructions} onChange={e=>setDraft({...draft,file_instructions:e.target.value})} placeholder="Formats attendus, consignes Word/Excel, etc."/>
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
            <input type="checkbox" checked={draft.allow_external_window} onChange={e=>setDraft({...draft,allow_external_window:e.target.checked})}/>
            Autoriser temporairement une autre fenetre pour cette question
          </label>
        </>}
        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold">
          <input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/>
          Question active
        </label>
      </div>
      <button onClick={addQuestion} className="btn-secondary mt-5">Ajouter la question</button>
    </div>

    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-black">Generer une epreuve pour un poste</h3>
      <p className="mt-2 max-w-3xl text-sm text-slate-500">Selectionnez le poste et le nombre de questions souhaite par type. L'epreuve pioche aleatoirement dans la banque de questions taguee pour ce poste, puis devient l'epreuve active envoyee aux candidats de ce poste.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">Poste
          <select className="admin-input" value={examRequest.job_offer_id} onChange={e=>setExamRequest({...examRequest,job_offer_id:e.target.value})}>
            <option value="">Selectionner un poste</option>
            {jobOffers.map(offer=><option key={offer.id} value={offer.id}>{offer.title}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold lg:col-span-2">Titre de l'epreuve
          <input className="admin-input" value={examRequest.title} onChange={e=>setExamRequest({...examRequest,title:e.target.value})} placeholder="Ex: Epreuve Nutritionniste Senior - session 1"/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Nombre de QCU (une reponse)
          <input className="admin-input" type="number" min={0} value={examRequest.qcm_count} onChange={e=>setExamRequest({...examRequest,qcm_count:Number(e.target.value)})}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Nombre de QCM (plusieurs reponses)
          <input className="admin-input" type="number" min={0} value={examRequest.multi_qcm_count} onChange={e=>setExamRequest({...examRequest,multi_qcm_count:Number(e.target.value)})}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Nombre de cas pratiques
          <input className="admin-input" type="number" min={0} value={examRequest.case_study_count} onChange={e=>setExamRequest({...examRequest,case_study_count:Number(e.target.value)})}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Nombre de questions ouvertes
          <input className="admin-input" type="number" min={0} value={examRequest.open_count} onChange={e=>setExamRequest({...examRequest,open_count:Number(e.target.value)})}/>
        </label>
        <label className="grid gap-2 text-sm font-bold">Nombre de travaux avec fichier
          <input className="admin-input" type="number" min={0} value={examRequest.file_upload_count} onChange={e=>setExamRequest({...examRequest,file_upload_count:Number(e.target.value)})}/>
        </label>
      </div>
      <button onClick={generateExam} disabled={generating} className="btn-primary mt-5">{generating?"Generation...":"Generer l'epreuve"}</button>

      <div className="mt-6 grid gap-3">
        {exams.map(exam=><div key={exam.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
          <div>
            <b>{exam.title}</b>
            <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{jobOfferLabel(exam.job_offer_id)} · {(exam.question_ids||[]).length} question(s) · {new Date(exam.created_at).toLocaleDateString("fr-FR")}</p>
          </div>
          <span className={exam.active?"rounded-full bg-leaf px-3 py-1 text-xs font-bold text-white":"rounded-full bg-slate-300 px-3 py-1 text-xs font-bold text-slate-700"}>{exam.active?"Active":"Remplacee"}</span>
        </div>)}
        {!exams.length&&<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucune epreuve generee pour le moment.</p>}
      </div>
    </div>

    <div className="mt-8 grid gap-3">
      {questions.map(question=><div key={question.id} className="rounded-2xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <b>{question.prompt}</b>
            <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{question.question_type} · {jobOfferLabel(question.job_offer_id)} · {question.points} points · position {question.position}</p>
          </div>
          <button onClick={()=>toggleQuestion(question)} className={question.active?"rounded-full bg-leaf px-4 py-2 text-xs font-bold text-white":"rounded-full bg-slate-300 px-4 py-2 text-xs font-bold text-slate-700"}>{question.active?"Active":"Inactive"}</button>
        </div>
      </div>)}
      {!questions.length&&<p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucune question configuree pour le moment.</p>}
    </div>
  </section>;
}

function toLocalInput(value:string|null){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

function fromLocalInput(value:string){
  if(!value)return null;
  return new Date(value).toISOString();
}
