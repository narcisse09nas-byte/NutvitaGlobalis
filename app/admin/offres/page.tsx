import AdminShell from "@/components/admin/AdminShell";
import PlanManager from "@/components/admin/PlanManager";
import ConsultationPriceManager from "@/components/admin/ConsultationPriceManager";
import {requireAdmin} from "@/lib/admin";
export default async function OffersPage(){const{supabase,admin}=await requireAdmin();const[{data:plans},{data:consultations}]=await Promise.all([supabase.from("subscription_plans").select("*").order("service_type").order("duration_months"),supabase.from("consultation_service_prices").select("*").order("service_key")]);return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Offres et prix</h1><p className="mt-2 text-slate-500">Tarifs administrables, libellés bilingues et disponibilité des suivis autonomes et des consultations.</p></div><PlanManager initial={plans||[]}/><ConsultationPriceManager initial={consultations||[]}/></AdminShell>}
