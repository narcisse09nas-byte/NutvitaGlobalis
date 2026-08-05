import Link from "next/link";import CandidateAuth from "@/components/candidate/CandidateAuth";import CandidateShell from "@/components/candidate/CandidateShell";import ApplicationStepper from "@/components/candidate/ApplicationStepper";import NotificationsPanel from "@/components/candidate/NotificationsPanel";import ProgressRing from "@/components/shared/ProgressRing";import {hasSupabaseConfig} from "@/lib/supabase/config";import {createClient} from "@/lib/supabase/server";import {applicationStatuses,documentFields,type ApplicationStatus} from "@/lib/recruitment-data";
export const metadata={title:"Espace candidat"};

const stageOrder:ApplicationStatus[]=["started","submitted","test_completed","interview_completed","selected"];
function progressPercent(status:ApplicationStatus){
  if(["selected","rejected","integrated"].includes(status))return 100;
  if(["invited_to_interview","interview_completed"].includes(status))return 75;
  if(["invited_to_test","test_completed"].includes(status))return 50;
  if(["submitted","under_review","incomplete","preselected"].includes(status))return 25;
  return 5;
}

export default async function CandidatePage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const params=await searchParams;
  if(!hasSupabaseConfig())return <AuthScreen setup/>;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return <AuthScreen/>;
  const {data:application}=await supabase.from('recruitment_applications').select('*').eq('candidate_id',user.id).maybeSingle();
  const [{data:notifications},{data:history},{data:documents},{data:offer}]=await Promise.all([
    supabase.from('recruitment_notifications').select('*').eq('candidate_id',user.id).order('created_at',{ascending:false}).limit(10),
    application?supabase.from('recruitment_history').select('*').eq('application_id',application.id).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
    application?supabase.from('candidate_documents').select('*').eq('application_id',application.id).order('created_at',{ascending:false}):Promise.resolve({data:[]}),
    application?.job_offer_id?supabase.from('recruitment_job_offers').select('id,title,department,location').eq('id',application.job_offer_id).maybeSingle():Promise.resolve({data:null}),
  ]);
  const status=(application?.status||'started') as ApplicationStatus;
  const percent=progressPercent(status);
  const documentLabel=(type:string)=>documentFields.find(([key])=>key===type)?.[1]||type;
  const isPromoterFlow=application?.recruitment_type==='promoter'||(!application&&params.type==='promoter');
  const dossierHref=isPromoterFlow?'/candidat/dossier?type=promoter':'/candidat/dossier';
  return <CandidateShell email={user.email||''}><div className="grid gap-6">
    <div><h1 className="text-3xl font-black">Bonjour {user.user_metadata.full_name||''} 👋</h1><p className="mt-2 text-slate-500">{isPromoterFlow?"Suivez l'avancement de votre candidature au programme promoteurs NutVitaGlobalis.":"Suivez l'avancement de votre candidature au sein de NutVitaGlobalis."}</p></div>
    {params.submitted&&<p className="rounded-xl bg-mint p-4 font-bold text-forest">Votre dossier a été soumis définitivement.</p>}

    <div className="grid gap-5 md:grid-cols-3">
      <div className="rounded-2xl border bg-white p-6 md:col-span-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Statut actuel</p>
        <h2 className="mt-3 text-2xl font-black">{applicationStatuses[status]}</h2>
        <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : {application?.updated_at?new Date(application.updated_at).toLocaleString('fr-FR'):'Dossier non commencé'}</p>
        <Link href={dossierHref} className="btn-primary mt-6">{application?'Consulter mon dossier':'Commencer ma candidature'}</Link>
      </div>
      <div className="rounded-2xl bg-forest p-6 text-white">
        <p className="text-sm text-white/60">Ma progression</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative grid place-items-center"><ProgressRing percent={percent}/><span className="absolute text-lg font-black text-white">{percent}%</span></div>
          <div><p className="text-2xl font-black text-white">{percent}%</p><p className="text-xs text-white/60">{percent>=100?'Dossier complet ✓':'La majorité des étapes sont complétées avant la décision finale.'}</p></div>
        </div>
        <a href="#etapes" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25">Voir le détail des étapes</a>
      </div>
    </div>

    <div id="etapes" className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-2xl border bg-white p-6 lg:col-span-2">
        <h2 className="text-xl font-black">Étapes de ma candidature</h2>
        <div className="mt-6"><ApplicationStepper status={status} history={history||[]}/></div>
      </div>
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-black">Offre concernée</h2>
        {offer?<><p className="mt-4 font-black text-forest">{offer.title}</p><p className="mt-1 text-sm text-slate-500">{[offer.department,offer.location].filter(Boolean).join(' · ')}</p><Link href={`/carrieres/${offer.id}`} className="btn-secondary mt-5">Voir les détails de l'offre</Link></>:<p className="mt-4 text-sm text-slate-400">Aucune offre spécifique associée à votre dossier.</p>}
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2"><NotificationsPanel initial={notifications||[]}/><Link href="/candidat/messages" className="mt-3 block text-center text-sm font-black text-leaf">Voir toutes les notifications →</Link></div>
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-black">Mes documents</h2>
        <div className="mt-4 grid gap-2">
          {(documents||[]).slice(0,6).map(doc=><Link key={doc.id} href="/candidat/dossier" className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 hover:bg-mint"><span><b className="block text-sm text-forest">{doc.file_name}</b><span className="text-xs text-slate-400">{documentLabel(doc.document_type)} · {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span></span><span className="text-slate-400">→</span></Link>)}
          {!(documents||[]).length&&<p className="text-sm text-slate-400">Aucun document ajouté.</p>}
        </div>
        <Link href="/candidat/dossier" className="mt-4 block text-center text-sm font-black text-leaf">Voir tous mes documents →</Link>
      </div>
    </div>
  </div></CandidateShell>;
}
function AuthScreen({setup=false}:{setup?:boolean}){return <main className="grid min-h-screen place-items-center bg-forest p-5">{setup?<div className="max-w-md rounded-3xl bg-white p-8"><h1 className="text-2xl font-black">Configuration requise</h1><p className="mt-3">Connectez Supabase et exécutez le schéma de recrutement.</p></div>:<CandidateAuth/>}</main>}
