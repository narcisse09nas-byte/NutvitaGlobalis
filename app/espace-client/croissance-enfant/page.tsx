import ClientShell from "@/components/client/ClientShell";
import ChildGrowthCenter from "@/components/client/ChildGrowthCenter";
import {requireClient} from "@/lib/client";
import {getApplicableTax} from "@/lib/taxes";

export default async function ChildGrowthPage(){
  const {supabase,user,profile}=await requireClient();
  const now=new Date().toISOString();
  const [{data:children},{data:measurements},{data:subscriptions},{data:plan},{data:analyses},{data:alerts},{data:reports},tax]=await Promise.all([
    supabase.from('children').select('*').eq('parent_id',user.id).eq('active',true).order('created_at'),
    supabase.from('child_growth_measurements').select('*, children!inner(parent_id)').eq('children.parent_id',user.id).order('measured_at'),
    supabase.from('subscriptions').select('*').eq('client_id',user.id).eq('status','active').gt('expires_at',now).not('child_id','is',null),
    supabase.from('subscription_plans').select('*').eq('id','child-growth-yearly').eq('active',true).maybeSingle(),
    supabase.from('child_growth_analyses').select('*').order('created_at',{ascending:false}),
    supabase.from('child_growth_alerts').select('*').order('created_at',{ascending:false}),
    supabase.from('child_growth_reports').select('*').order('created_at',{ascending:false}),
    getApplicableTax(supabase,profile?.country_code,'subscription'),
  ]);
  return <ClientShell email={user.email||''}><div className="mb-7"><h1 className="text-3xl font-black">Suivi Promotion Croissance Enfant</h1><p className="mt-2 text-slate-500">10 000 FCFA HT par enfant et par an.</p></div><ChildGrowthCenter parentId={user.id} initialChildren={children||[]} initialMeasurements={measurements||[]} subscriptions={subscriptions||[]} plan={plan} taxRate={Number(tax.rate)} initialAnalyses={analyses||[]} initialAlerts={alerts||[]} initialReports={reports||[]}/></ClientShell>
}
