import AdminShell from "@/components/admin/AdminShell";
import {requireAdmin} from "@/lib/admin";

export default async function HealthAdminPage(){
  const {supabase,admin}=await requireAdmin();
  const [{data:clients},{data:alerts},{data:childAlerts},{data:reports},{data:bookings}]=await Promise.all([
    supabase.from('client_profiles').select('id,full_name,email,country,city').order('full_name').limit(100),
    supabase.from('alerts').select('*').is('acknowledged_at',null).order('created_at',{ascending:false}).limit(20),
    supabase.from('child_growth_alerts').select('*, children(full_name)').is('acknowledged_at',null).order('created_at',{ascending:false}).limit(20),
    supabase.from('health_reports').select('id,title,client_id,created_at').order('created_at',{ascending:false}).limit(20),
    supabase.from('consultation_bookings').select('id,status,scheduled_at,client_id,teleconseils(name)').order('created_at',{ascending:false}).limit(20),
  ]);
  return <AdminShell name={admin.full_name||admin.email}>
    <div className="mb-7"><h1 className="text-3xl font-black">Administration Sante</h1><p className="mt-2 text-slate-500">Dossiers autorises, alertes, rapports et consultations.</p></div>
    <div className="mb-7 grid gap-4 sm:grid-cols-4"><Metric label="Clients" value={clients?.length||0}/><Metric label="Alertes sante" value={alerts?.length||0}/><Metric label="Alertes enfant" value={childAlerts?.length||0}/><Metric label="Rapports recents" value={reports?.length||0}/></div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Alertes a verifier">{[...(alerts||[]),...(childAlerts||[])].map((item:any)=><article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.title}</b><p className="mt-1 text-sm text-slate-600">{item.message}</p></article>)}</Section>
      <Section title="Consultations recentes">{bookings?.map((item:any)=><article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{relationName(item.teleconseils)||'Consultation'}</b><p className="text-sm">Statut : {item.status}</p></article>)}</Section>
      <Section title="Clients">{clients?.map((item:any)=><article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.full_name||item.email}</b><p className="text-sm text-slate-500">{item.email} - {[item.city,item.country].filter(Boolean).join(', ')}</p></article>)}</Section>
      <Section title="Rapports recents">{reports?.map((item:any)=><article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.title}</b><p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('fr-FR')}</p></article>)}</Section>
    </div>
  </AdminShell>;
}
function Metric({label,value}:{label:string;value:number}){return <div className="rounded-2xl border bg-white p-5"><p className="text-3xl font-black text-forest">{value}</p><p className="text-sm text-slate-500">{label}</p></div>}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="grid max-h-[440px] gap-3 overflow-y-auto">{children}</div></section>}
function relationName(value:{name?:string}|Array<{name?:string}>|null){return Array.isArray(value)?value[0]?.name:value?.name}

