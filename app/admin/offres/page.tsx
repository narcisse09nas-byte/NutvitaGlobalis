import AdminShell from "@/components/admin/AdminShell";
import PlanManager from "@/components/admin/PlanManager";
import { requireAdmin } from "@/lib/admin";
export default async function OffersPage(){const {supabase,admin}=await requireAdmin();const {data}=await supabase.from("subscription_plans").select("*").order("service_type").order("duration_months");return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Offres Suivi Sante</h1><p className="mt-2 text-slate-500">Prix hors taxe et disponibilite du suivi autonome et de la croissance enfant.</p></div><PlanManager initial={data||[]}/></AdminShell>}
