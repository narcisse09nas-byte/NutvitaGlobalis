import Link from 'next/link';
import PartnerShell from '@/components/partner/PartnerShell';
import { requirePartner } from '@/lib/partner';
import { getCurrentLocale } from '@/lib/i18n-server';
import { ChatBubbleLeftRightIcon, CreditCardIcon, PhoneIcon, UserGroupIcon } from '@heroicons/react/24/outline';

type Params = { from?: string; to?: string };
type Row = Record<string, any>;

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { supabase, user, profile } = await requirePartner();
  const english = (await getCurrentLocale()) === 'en';
  const t = (fr: string, en: string) => english ? en : fr;
  const now = new Date().toISOString();
  let consultationQuery = supabase.from('partner_consultations').select('*,client_profiles(full_name,email)').eq('partner_id', profile.id).order('scheduled_at', { ascending: false });
  let ledgerQuery = supabase.from('partner_ledger').select('*').eq('partner_id', profile.id).order('occurred_at', { ascending: false });
  let payoutQuery = supabase.from('partner_payouts').select('*').eq('partner_id', profile.id).order('created_at', { ascending: false });
  if (params.from) {
    consultationQuery = consultationQuery.gte('scheduled_at', params.from);
    ledgerQuery = ledgerQuery.gte('occurred_at', params.from);
    payoutQuery = payoutQuery.gte('created_at', params.from);
  }
  if (params.to) {
    const end = `${params.to}T23:59:59`;
    consultationQuery = consultationQuery.lte('scheduled_at', end);
    ledgerQuery = ledgerQuery.lte('occurred_at', end);
    payoutQuery = payoutQuery.lte('created_at', end);
  }
  const [{ data: consultations }, { data: ledger }, { data: payouts }, { count: clients }, { count: waiting }] = await Promise.all([
    consultationQuery,
    ledgerQuery,
    payoutQuery,
    supabase.from('client_profiles').select('id', { count: 'exact', head: true }).or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).gte('partner_access_expires_at', now),
    supabase.from('consultation_waiting_room').select('id', { count: 'exact', head: true }).in('status', ['waiting', 'partner_interested', 'assigned_pending_partner']),
  ]);
  const wallet = (ledger || []).filter((x: Row) => ['earning', 'adjustment'].includes(x.entry_type) && ['approved', 'paid'].includes(x.status)).reduce((sum: number, x: Row) => sum + Number(x.amount || 0), 0);
  const paid = (payouts || []).filter((x: Row) => x.status === 'paid').reduce((sum: number, x: Row) => sum + Number(x.amount || 0), 0);
  const balance = Math.max(wallet - paid, 0);
  return <PartnerShell email={user.email || ''}>
    <header className='mb-7'><p className='text-sm font-bold uppercase tracking-widest text-leaf'>{t('Partenaire actif','Active partner')}</p><h1 className='mt-2 text-3xl font-black'>{t('Bonjour','Hello')} {profile.full_name}</h1><p className='mt-2 text-slate-500'>{t('Votre activité clinique et votre collaboration avec NutVitaGlobalis.','Your clinical activity and collaboration with NutVitaGlobalis.')}</p></header>
    <form className='mb-6 grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-[1fr_1fr_auto_auto]'><label className='grid gap-2 text-sm font-bold'>{t('Début','From')}<input name='from' type='date' defaultValue={params.from || ''} className='admin-input'/></label><label className='grid gap-2 text-sm font-bold'>{t('Fin','To')}<input name='to' type='date' defaultValue={params.to || ''} className='admin-input'/></label><button className='btn-primary self-end'>{t('Filtrer','Filter')}</button><Link href='/partenaire' className='btn-secondary self-end'>{t('Réinitialiser','Reset')}</Link></form>
    <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-6'>
      <Metric label={t('Consultations','Consultations')} value={consultations?.length || 0} icon={PhoneIcon}/><Metric label={t('Clients actifs','Active clients')} value={clients || 0} icon={UserGroupIcon}/><Metric label={t('Cagnotte constituée','Accrued wallet')} value={`${wallet.toLocaleString('fr-FR')} FCFA`} icon={CreditCardIcon}/><Metric label={t('Montant déjà versé','Amount already paid')} value={`${paid.toLocaleString('fr-FR')} FCFA`} icon={CreditCardIcon}/><Metric label={t('Solde restant à verser','Outstanding balance')} value={`${balance.toLocaleString('fr-FR')} FCFA`} icon={CreditCardIcon}/><Metric label={t('En salle d’attente','In waiting room')} value={waiting || 0} icon={ChatBubbleLeftRightIcon}/>
    </section>
    <section className='mt-7 rounded-2xl border bg-white p-4 sm:p-6'><div className='mb-5 flex flex-wrap items-center justify-between gap-3'><div><h2 className='text-xl font-black'>{t('Registre des consultations récentes','Recent consultations register')}</h2><p className='text-sm text-slate-500'>{t('La période sélectionnée s’applique au registre et aux montants.','The selected period applies to both the register and the financial totals.')}</p></div><Link href='/partenaire/consultations' className='btn-primary'>{t('Nouvelle consultation','New consultation')}</Link></div>
      <div className='overflow-x-auto'><table className='w-full min-w-[1080px] text-left text-sm'><thead className='bg-slate-50 text-xs uppercase text-slate-500'><tr><th className='p-3'>{t('ID consultation','Consultation ID')}</th><th className='p-3'>{t('Date','Date')}</th><th className='p-3'>{t('Client','Client')}</th><th className='p-3'>{t('Objectif','Objective')}</th><th className='p-3'>{t('Nature','Nature')}</th><th className='p-3'>{t('Type','Type')}</th><th className='p-3'>{t('Action','Action')}</th></tr></thead><tbody>{(consultations || []).map((item: Row) => <tr key={item.id} className='border-t align-top'><td className='p-3 font-black text-forest'>{item.consultation_code || `NVG${String(item.id).replace(/-/g,'').slice(0,5).toUpperCase()}`}</td><td className='p-3'>{item.scheduled_at ? new Date(item.scheduled_at).toLocaleString(english ? 'en-GB' : 'fr-FR') : '-'}</td><td className='p-3 font-bold'>{item.client_profiles?.full_name || item.client_profiles?.email || '-'}</td><td className='max-w-xs p-3'>{objective(item, t)}</td><td className='p-3'>{nature(item.consultation_nature, t)}</td><td className='p-3'>{consultationType(item.source, t)}</td><td className='p-3'><Link className='font-black text-leaf hover:underline' href={`/partenaire/consultations/${item.id}`}>{t('Voir la fiche','View record')}</Link></td></tr>)}{!consultations?.length && <tr><td colSpan={7} className='p-10 text-center text-slate-400'>{t('Aucune consultation sur cette période.','No consultation in this period.')}</td></tr>}</tbody></table></div>
    </section>
  </PartnerShell>;
}

function objective(item: Row, t: (fr:string,en:string)=>string) { const goals = Array.isArray(item.goals) ? item.goals : []; return goals[0]?.label || goals[0]?.target || item.objectives || item.reason || t('À préciser','To be defined'); }
function nature(value: string, t: (fr:string,en:string)=>string) { return ({ first_contact:t('Premier contact','First contact'), appointment:t('Consultation sur rendez-vous','Scheduled consultation'), other:t('Autre','Other') } as Row)[value] || t('Consultation sur rendez-vous','Scheduled consultation'); }
function consultationType(value: string, t: (fr:string,en:string)=>string) { return ({ online:t('En ligne','Online'), onsite:t('En présentiel','In person'), partner_direct:t('En présentiel','In person'), home_visit:t('À domicile','Home visit') } as Row)[value] || value || '-'; }
function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) { return <article className='min-w-0 rounded-2xl border bg-white p-5'><Icon className='h-7 text-leaf'/><p className='mt-4 break-words text-2xl font-black text-forest'>{value}</p><p className='mt-1 text-sm text-slate-500'>{label}</p></article>; }
