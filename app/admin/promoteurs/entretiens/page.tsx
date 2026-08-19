import AdminShell from "@/components/admin/AdminShell";
import InterviewManager from "@/components/admin/InterviewManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin, user } = await requireAdmin();
  const { data: applications } = await supabase.from("recruitment_applications").select("id,full_name,email,status").eq("recruitment_type", "promoter").not("status", "in", '("started","rejected")').order("full_name");
  const ids = (applications || []).map((item: Record<string, unknown>) => item.id);
  let interviews: Record<string, unknown>[] = [];
  if (ids.length) {
    const result = await supabase.from("video_interviews").select("*, recruitment_applications(full_name,email,recruitment_type), interview_evaluations(*)").in("application_id", ids).order("scheduled_at", { ascending: false });
    interviews = result.data || [];
  }
  return <AdminShell name={admin.full_name || admin.email}>
    <div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Recrutement promoteurs</p><h1 className="mt-2 text-4xl font-black">Entretiens</h1><p className="mt-2 text-slate-500">Planification, jury, salle vidéo, échanges et grille d’évaluation des promoteurs.</p></div>
    <InterviewManager applications={applications || []} initial={interviews} adminId={user.id} />
  </AdminShell>;
}
