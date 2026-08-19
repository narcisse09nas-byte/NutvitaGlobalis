import AdminShell from "@/components/admin/AdminShell";
import RecruitmentManager from "@/components/admin/RecruitmentManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const { data: applications } = await supabase
    .from("recruitment_applications")
    .select("*")
    .eq("recruitment_type", "promoter")
    .in("status", ["started", "submitted", "under_review", "incomplete", "preselected", "invited_to_interview"])
    .order("created_at", { ascending: false });
  return <AdminShell name={admin.full_name || admin.email}>
    <div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Recrutement promoteurs</p><h1 className="mt-2 text-4xl font-black">Salle d’attente</h1><p className="mt-2 text-slate-500">Analysez les manifestations d’intérêt et faites progresser chaque candidat sans test écrit.</p></div>
    <RecruitmentManager initial={applications || []} questions={[]} />
  </AdminShell>;
}
