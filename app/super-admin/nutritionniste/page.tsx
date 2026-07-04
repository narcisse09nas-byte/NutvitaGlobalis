import AdminShell from "@/components/admin/AdminShell";
import ConsultationManager from "@/components/partner/ConsultationManager";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function SuperAdminNutritionistPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from("admin_users").select("role").eq("id", admin.id).single();
  if (current?.role !== "super_admin") redirect("/admin?acces=refuse");
  const [{ data: consultations }, { data: clients }, { data: dietitians }] = await Promise.all([
    supabase.from("partner_consultations").select("*, client_profiles(*)").order("scheduled_at", { ascending: false }),
    supabase.from("client_profiles").select("*, children(id,full_name,birth_date,sex)").order("full_name"),
    supabase.from("dietitian_profiles").select("id,full_name,candidate_id").eq("status", "active").order("full_name"),
  ]);
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Supervision clinique</p><h1 className="mt-2 text-3xl font-black">Interface nutritionniste</h1><p className="mt-2 text-slate-500">La fiche est identique à celle du professionnel. Sélectionnez le nutritionniste responsable avant de finaliser.</p></div><ConsultationManager initial={consultations || []} clients={clients || []} partnerId="" dietitians={dietitians || []}/></AdminShell>;
}
