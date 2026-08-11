import Link from 'next/link';
import { notFound } from 'next/navigation';
import PartnerShell from '@/components/partner/PartnerShell';
import PrintCardButton from '@/components/shared/PrintCardButton';
import { requirePartner } from '@/lib/partner';
import { getCurrentLocale } from '@/lib/i18n-server';

type Row=Record<string,any>;
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const {supabase,user,profile}=await requirePartner();
  const english=(await getCurrentLocale())==='en';
  const t=(fr:string,en:string)=>english?en:fr;
  const {data:item}=await supabase.from('partner_consultations').select('*,client_profiles(*)').eq('id',id).eq('partner_id',profile.id).maybeSingle();
  if(!item)notFound();
  let reportUrl:string|null=null;
  if(item.consultation_pdf_path){const {data}=await supabase.storage.from('document-vault').createSignedUrl(item.consultation_pdf_path,600);reportUrl=data?.signedUrl||null;}
  return <PartnerShell email={user.email||''}><div className='mx-auto max-w-5xl'>
    <div className='mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden'><Link href='/partenaire' className='font-black text-leaf'>← {t('Retour au registre','Back to register')}</Link><div className='flex flex-wrap gap-2'>{reportUrl&&<a href={reportUrl} target='_blank' rel='noreferrer' className='btn-secondary'>{t('Ouvrir le PDF','Open PDF')}</a>}<PrintCardButton label={t('Imprimer la fiche','Print record')}/></div></div>
    <article className='rounded-3xl border bg-white p-6 shadow-sm sm:p-9'><header className='border-b pb-6'><p className='text-xs font-black uppercase tracking-[.2em] text-orange'>{t('Fiche de consultation nutritionnelle','Nutrition consultation record')}</p><div className='mt-3 flex flex-wrap items-end justify-between gap-3'><h1 className='text-3xl font-black text-forest'>{item.consultation_code||`NVG${String(item.id).replace(/-/g,'').slice(0,5).toUpperCase()}`}</h1><p className='text-sm text-slate-500'>{item.scheduled_at?new Date(item.scheduled_at).toLocaleString(english?'en-GB':'fr-FR'):'-'}</p></div></header>
      <section className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'><Info label={t('Client','Client')} value={item.client_profiles?.full_name||item.client_profiles?.email}/><Info label={t('Nature','Nature')} value={nature(item.consultation_nature,t)}/><Info label={t('Type','Type')} value={kind(item.source,t)}/><Info label={t('Motif et objectif','Reason and objective')} value={objective(item,t)}/><Info label={t('Statut','Status')} value={item.status}/><Info label={t('Prochain rendez-vous','Next appointment')} value={item.next_appointment_at?new Date(item.next_appointment_at).toLocaleString(english?'en-GB':'fr-FR'):t('Non programmé','Not scheduled')}/></section>
      <section className='mt-6 grid gap-5 md:grid-cols-2'><Block title={t('Plaintes et contexte','Complaints and context')} value={[item.complaint_notes,list(item.complaints)].filter(Boolean).join('\n')}/><Block title={t('Objectifs convenus','Agreed goals')} value={list(item.goals)||item.objectives}/><Block title={t('Synthèse clinique','Clinical summary')} value={item.summary}/><Block title={t('Plan d’accompagnement','Care plan')} value={objectText(item.care_plan)}/><Block title={t('Recommandations','Recommendations')} value={item.recommendations}/><Block title={t('Examens demandés','Requested tests')} value={list(item.prescription_items)}/></section>
    </article>
  </div></PartnerShell>;
}
function Info({label,value}:{label:string;value:any}){return <div className='rounded-2xl bg-slate-50 p-4'><p className='text-xs font-bold uppercase text-slate-400'>{label}</p><p className='mt-2 break-words font-bold text-forest'>{String(value||'-')}</p></div>}
function Block({title,value}:{title:string;value:any}){return <div className='rounded-2xl border p-5'><h2 className='font-black text-forest'>{title}</h2><p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600'>{String(value||'-')}</p></div>}
function list(v:any){return Array.isArray(v)?v.map((x:any)=>typeof x==='string'?x:x.label||x.name||x.target).filter(Boolean).join('\n'):''}
function objectText(v:any){return v&&typeof v==='object'?Object.entries(v).filter(([,x])=>x).map(([k,x])=>`${k}: ${typeof x==='object'?JSON.stringify(x):x}`).join('\n'):v||''}
function objective(i:Row,t:(fr:string,en:string)=>string){return (Array.isArray(i.goals)&&i.goals[0]?.label)||i.objectives||i.reason||t('À préciser','To be defined')}
function nature(v:string,t:(fr:string,en:string)=>string){return ({first_contact:t('Premier contact','First contact'),appointment:t('Consultation sur rendez-vous','Scheduled consultation'),other:t('Autre','Other')} as Row)[v]||t('Consultation sur rendez-vous','Scheduled consultation')}
function kind(v:string,t:(fr:string,en:string)=>string){return ({online:t('En ligne','Online'),onsite:t('En présentiel','In person'),partner_direct:t('En présentiel','In person'),home_visit:t('À domicile','Home visit')} as Row)[v]||v||'-'}
