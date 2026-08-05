import ClientShell from "@/components/client/ClientShell";
import NutritionConsultationDashboard from "@/components/client/NutritionConsultationDashboard";
import {requireTeleconsultationAccess} from "@/lib/client";
import {getCurrentLocale} from "@/lib/i18n-server";
import {getConsultationDashboardSettings} from "@/lib/consultation-dashboard";
export default async function ClientConsultationsPage(){
 const{supabase,user,profile}=await requireTeleconsultationAccess();
 const partnerId=profile?.assigned_partner_id||profile?.created_by_partner_id||null;
 const[locale,settings,{data:appointments},{data:consultations},{data:anthropometry},{data:biology},{data:food},partnerResult]=await Promise.all([
  getCurrentLocale(),getConsultationDashboardSettings(),
  supabase.from("appointments").select("*").eq("client_id",user.id).order("scheduled_at",{ascending:false}).limit(20),
  supabase.from("partner_consultations").select("*").eq("client_id",user.id).eq("status","completed").order("finalized_at",{ascending:false}).limit(20),
  supabase.from("anthropometric_measurements").select("*").eq("client_id",user.id).order("measured_at",{ascending:false}).limit(20),
  supabase.from("biological_measurements").select("*").eq("client_id",user.id).order("measured_at",{ascending:false}).limit(20),
  supabase.from("food_history").select("*").eq("client_id",user.id).order("entry_date",{ascending:false}).limit(12),
  partnerId?supabase.from("dietitian_profiles").select("*").eq("id",partnerId).maybeSingle():Promise.resolve({data:null}),
 ]);
 return <ClientShell email={user.email||""} service="teleconsultation"><NutritionConsultationDashboard settings={settings} profile={profile||{email:user.email}} partner={partnerResult.data} appointments={appointments||[]} consultations={consultations||[]} anthropometry={anthropometry||[]} biology={biology||[]} food={food||[]} english={locale==="en"}/></ClientShell>;
}