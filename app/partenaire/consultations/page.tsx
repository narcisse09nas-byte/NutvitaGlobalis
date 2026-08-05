import PartnerShell from "@/components/partner/PartnerShell";
import ConsultationManager from "@/components/partner/ConsultationManager";
import ConsultationProfessionalOverview from "@/components/partner/ConsultationProfessionalOverview";
import {requirePartner} from "@/lib/partner";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){
 const {supabase,user,profile}=await requirePartner();
 const locale=await getCurrentLocale(),en=locale==="en",now=new Date().toISOString();
 const [{data:consultations},{data:clients}]=await Promise.all([
  supabase.from("partner_consultations").select("*, client_profiles(*)").eq("partner_id",profile.id).order("scheduled_at",{ascending:false}),
  supabase.from("client_profiles").select("*, children(id,full_name,birth_date,sex)").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).gte("partner_access_expires_at",now).order("full_name")
 ]);
 return <PartnerShell email={user.email||""}><header className="mb-7"><span className="text-xs font-black uppercase tracking-[.2em] text-orange">NutVitaGlobalis Consultations</span><h1 className="mt-2 text-3xl font-black text-forest">{en?"Nutrition and dietetic consultations":"Espace consultations nutritionnelles et diététiques"}</h1><p className="mt-2 max-w-3xl text-slate-500">{en?"Manage your active patients, appointments, teleconsultations and clinical follow-up from a single secure workspace.":"Gérez vos patients actifs, rendez-vous, téléconsultations et suivis cliniques depuis un espace de travail unique et sécurisé."}</p></header><ConsultationProfessionalOverview consultations={consultations||[]} clients={clients||[]} english={en}/><section className="rounded-3xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="mb-5 text-xl font-black text-forest">{en?"Consultation workspace":"Gestion des consultations"}</h2><ConsultationManager initial={consultations||[]} clients={clients||[]} partnerId={profile.id} locale={locale}/></section></PartnerShell>;
}
