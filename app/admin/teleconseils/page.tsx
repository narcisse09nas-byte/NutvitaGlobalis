import AdminShell from "@/components/admin/AdminShell";
import ConsultationAdminDashboard from "@/components/admin/ConsultationAdminDashboard";
import {requireAdmin} from "@/lib/admin";
export default async function Page(){
 const {supabase,admin}=await requireAdmin();
 const [{data:consultations},{data:clients},{data:dietitians},{data:waiting}]=await Promise.all([
  supabase.from("partner_consultations").select("*, client_profiles(full_name,email), dietitian_profiles(full_name)").order("scheduled_at",{ascending:false}).limit(100),
  supabase.from("client_profiles").select("id,full_name,email,partner_assignment_status,partner_access_expires_at").order("updated_at",{ascending:false}).limit(200),
  supabase.from("dietitian_profiles").select("id,full_name,status,specialties").order("full_name"),
  supabase.from("consultation_waiting_room").select("*, client_profiles(full_name,email)").order("created_at",{ascending:false}).limit(100)
 ]);
 return <AdminShell name={admin.full_name||admin.email||"Administration"}><header className="mb-7"><span className="text-xs font-black uppercase tracking-[.2em] text-orange">Santé & clients</span><h1 className="mt-2 text-3xl font-black text-forest">Administration des consultations nutritionnelles et diététiques</h1><p className="mt-2 max-w-4xl text-slate-500">Supervisez les patients, les nutritionnistes, les rendez-vous, la salle d’attente et le fonctionnement du portail de consultation.</p></header><ConsultationAdminDashboard consultations={consultations||[]} clients={clients||[]} dietitians={dietitians||[]} waiting={waiting||[]}/></AdminShell>;
}