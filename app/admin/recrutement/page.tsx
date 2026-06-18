import AdminShell from "@/components/admin/AdminShell";
import ProctoringSummary from "@/components/admin/ProctoringSummary";
import RecruitmentManager from "@/components/admin/RecruitmentManager";
import TestConfigManager from "@/components/admin/TestConfigManager";
import {requireAdmin} from "@/lib/admin";

export default async function RecruitmentAdmin(){
  const {supabase,admin}=await requireAdmin();
  const [{data:applications},{data:questions},{data:attempts},{data:settings},{data:testCandidates}]=await Promise.all([
    supabase.from("recruitment_applications").select("*, recruitment_test_attempts(*)").order("created_at",{ascending:false}),
    supabase.from("recruitment_test_questions").select("*").order("position"),
    supabase.from("recruitment_test_attempts").select("*, recruitment_applications(full_name), test_proctoring_logs(*)").order("started_at",{ascending:false}),
    supabase.from("recruitment_test_settings").select("*").eq("id",1).maybeSingle(),
    supabase.from("recruitment_applications").select("id,full_name,email,status,city,country,specialization").in("status",["submitted","under_review","preselected","invited_to_test"]).order("full_name"),
  ]);

  return <AdminShell name={admin.full_name||admin.email}>
    <div className="mb-7">
      <h1 className="text-3xl font-black">Recrutement des partenaires</h1>
      <p className="mt-2 text-slate-500">Evaluez les dossiers, configurez le test ecrit et pilotez chaque etape de selection.</p>
    </div>
    <TestConfigManager initialSettings={settings} initialQuestions={questions||[]} candidates={testCandidates||[]}/>
    <RecruitmentManager initial={applications||[]} questions={questions||[]}/>
    <ProctoringSummary attempts={attempts||[]}/>
  </AdminShell>;
}
