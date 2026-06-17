import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {hasLocalAdminMode,hasSupabaseConfig} from "@/lib/supabase/config";
import {createLocalClient} from "@/lib/supabase/local";
import {localClientUser} from "@/lib/local-seed";

export type ClientEntitlements={health:boolean;childGrowth:boolean;teleconsultation:boolean};

export async function requireClient(){
  if(hasLocalAdminMode()&&!hasSupabaseConfig()){
    if((await cookies()).get('nutvita_local_client')?.value!=='1')redirect('/connexion');
    const supabase=createLocalClient();
    const {data:profile}=await supabase.from('client_profiles').select('*').eq('id',localClientUser.id).maybeSingle();
    return{supabase,user:localClientUser,profile};
  }
  if(!hasSupabaseConfig())redirect('/espace-client?setup=1');
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/connexion');
  const {data:profile}=await supabase.from('client_profiles').select('*').eq('id',user.id).maybeSingle();
  return{supabase,user,profile};
}

export async function getClientEntitlements(supabase:any,userId:string):Promise<ClientEntitlements>{
  const now=Date.now();
  const [{data:subscriptions},{data:plans},{data:bookings}]=await Promise.all([
    supabase.from('subscriptions').select('*').eq('client_id',userId).eq('status','active'),
    supabase.from('subscription_plans').select('id,service_type'),
    supabase.from('consultation_bookings').select('*').eq('client_id',userId),
  ]);
  const planTypes=new Map((plans||[]).map((plan:any)=>[plan.id,plan.service_type]));
  const active=(subscriptions||[]).filter((item:any)=>!item.expires_at||+new Date(item.expires_at)>now);
  return{
    health:active.some((item:any)=>!item.child_id&&(planTypes.get(item.plan_id)==='health_tracking'||String(item.plan_id).includes('health'))),
    childGrowth:active.some((item:any)=>planTypes.get(item.plan_id)==='child_growth'||String(item.plan_id).includes('child-growth')),
    teleconsultation:(bookings||[]).some((item:any)=>item.access_expires_at&&+new Date(item.access_expires_at)>now&&!['cancelled','refunded'].includes(item.status)),
  };
}

export async function requireHealthAccess(){const context=await requireClient(),access=await getClientEntitlements(context.supabase,context.user.id);if(!access.health)redirect('/espace-client/abonnement?acces=suivi-sante-requis');return{...context,access}}
export async function requireTeleconsultationAccess(){const context=await requireClient(),access=await getClientEntitlements(context.supabase,context.user.id);if(!access.teleconsultation)redirect('/teleconseils?acces=pack-requis');return{...context,access}}
