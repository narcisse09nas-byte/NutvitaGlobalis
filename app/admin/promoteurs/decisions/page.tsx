import AdminShell from "@/components/admin/AdminShell";
import RecruitmentManager from "@/components/admin/RecruitmentManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const { data: applications } = await supabase
    .from("recruitment_applications")
    .select("*")
    .eq("recruitment_type", "promoter")
    .in("status", ["invited_to_interview", "interview_completed", "selected", "rejected", "integrated"])
    .order("updated_at", { ascending: false });
  return <AdminShell name={admin.full_name || admin.email}>
    <div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Recrutement promoteurs</p><h1 className="mt-2 text-4xl font-black">Décisions et codes promotionnels</h1><p className="mt-2 text-slate-500">Finalisez l’évaluation. L’intégration active le profil, le numéro vendor et le code promotionnel.</p></div>
    <RecruitmentManager initial={applications || []} questions={[]} />
  </AdminShell>;
}
