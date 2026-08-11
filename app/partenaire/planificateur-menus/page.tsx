import PartnerShell from "@/components/partner/PartnerShell";
import ClientMenuPlannerWorkspace from "@/components/partner/ClientMenuPlannerWorkspace";
import {requirePartner} from "@/lib/partner";
export default async function Page(){
 const {supabase,user,profile}=await requirePartner();
 const [{data:clients},{data:menus}]=await Promise.all([
  supabase.from("client_profiles").select("id,client_number,full_name").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).order("full_name"),
  supabase.from("client_menu_plans").select("*,client_profiles(full_name)").eq("partner_id",profile.id).order("generated_at",{ascending:false})
 ]);
 return <PartnerShell email={user.email||""}><ClientMenuPlannerWorkspace partnerId={profile.id} clients={clients||[]} initial={menus||[]}/></PartnerShell>
}
