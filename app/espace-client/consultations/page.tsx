import ClientShell from "@/components/client/ClientShell";
import ConsultationRequestPanel from "@/components/client/ConsultationRequestPanel";
import {requireClient} from "@/lib/client";

export default async function ClientConsultationsPage(){
  const {supabase,user,profile}=await requireClient();
  const now=new Date().toISOString();
  const [{data:bookings},{data:subscriptions},{data:plans},{data:requests}]=await Promise.all([
    supabase.from("consultation_bookings").select("*, teleconseils(name)").eq("client_id",user.id).gt("access_expires_at",now).not("status","in",'("cancelled","refunded")').order("created_at",{ascending:false}),
    supabase.from("subscriptions").select("*").eq("client_id",user.id).eq("status","active").gt("expires_at",now),
    supabase.from("subscription_plans").select("id,tier,name,service_type").eq("tier","premium"),
    supabase.from("consultation_waiting_room").select("*").eq("client_id",user.id).order("created_at",{ascending:false}),
  ]);
  const premiumPlanIds=new Set((plans||[]).map((plan:any)=>plan.id));
  const premiumSubscriptions=(subscriptions||[]).filter((item:any)=>premiumPlanIds.has(item.plan_id));

  return <ClientShell email={user.email||""}>
    <div className="mb-7">
      <h1 className="text-3xl font-black">Mes consultations</h1>
      <p className="mt-2 text-slate-500">Sollicitez un teleconseiller depuis votre espace client, sans quitter votre session.</p>
    </div>
    <ConsultationRequestPanel clientId={user.id} profile={profile} bookings={bookings||[]} premiumSubscriptions={premiumSubscriptions} requests={requests||[]}/>
  </ClientShell>;
}
