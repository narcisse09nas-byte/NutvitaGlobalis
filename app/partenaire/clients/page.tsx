import PartnerShell from "@/components/partner/PartnerShell";
import PartnerClientManager from "@/components/partner/PartnerClientManager";
import {requirePartner} from "@/lib/partner";
export default async function Page(){
 const {supabase,user,profile}=await requirePartner();
 const [{data:clients},{data:requests},{data:partners}]=await Promise.all([
  supabase.from("client_profiles").select("*").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).order("created_at",{ascending:false}),
  supabase.from("consultation_waiting_room").select("id,request_code,client_id,reason,created_at").order("created_at",{ascending:false}),
  supabase.from("dietitian_profiles").select("id,full_name").eq("status","active").neq("id",profile.id).order("full_name")
 ]);
 const requestByClient=Object.fromEntries((requests||[]).map((x:Record<string,any>)=>[x.client_id,x]));
 const rows=(clients||[]).map((x:Record<string,any>)=>({...x,waiting_request:requestByClient[x.id]||null}));
 return <PartnerShell email={user.email||""}><PartnerClientManager initial={rows} partnerId={profile.id} collaborators={partners||[]}/></PartnerShell>
}
