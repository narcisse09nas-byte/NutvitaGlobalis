import PartnerShell from "@/components/partner/PartnerShell";
import PartnerConsultationWorkspace from "@/components/partner/PartnerConsultationWorkspace";
import {requirePartner} from "@/lib/partner";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){
 const {supabase,user,profile}=await requirePartner(),locale=await getCurrentLocale();
 const [{data:consultations},{data:clients}]=await Promise.all([
  supabase.from("partner_consultations").select("*, client_profiles(*)").eq("partner_id",profile.id).order("scheduled_at",{ascending:false}),
  supabase.from("client_profiles").select("*").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).order("full_name")
 ]);
 return <PartnerShell email={user.email||""}><header className="mb-7"><span className="text-xs font-black uppercase tracking-[.2em] text-orange">NutVitaGlobalis Consultations</span><h1 className="mt-2 text-3xl font-black text-forest">{locale==="en"?"Nutrition and dietetic consultations":"Espace consultations nutritionnelles et diététiques"}</h1></header><PartnerConsultationWorkspace initial={consultations||[]} clients={clients||[]} partnerId={profile.id} locale={locale}/></PartnerShell>
}
