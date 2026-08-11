import PartnerShell from "@/components/partner/PartnerShell";
import PartnerWaitingRoom from "@/components/partner/PartnerWaitingRoom";
import {requirePartner} from "@/lib/partner";
export default async function Page(){
 const {supabase,user,profile}=await requirePartner();
 const {data}=await supabase.from("consultation_waiting_room").select("*, client_profiles(full_name,email,phone,city,state_region,country,sex,complaints), selected_partner:dietitian_profiles!selected_partner_id(full_name)").in("status",["waiting","partner_interested","assigned_pending_partner","active"]).order("created_at",{ascending:false});
 return <PartnerShell email={user.email||""}><div className="mb-7"><h1 className="text-3xl font-black">Salle d’attente</h1><p className="mt-2 text-slate-500">Registre des demandes, des attributions et de leur historique.</p></div><PartnerWaitingRoom initial={data||[]} partnerId={profile.id}/></PartnerShell>
}
