import AdminShell from "@/components/admin/AdminShell";
import ProctoringSummary from "@/components/admin/ProctoringSummary";
import RecruitmentManager from "@/components/admin/RecruitmentManager";
import RecruitmentOverview from "@/components/admin/RecruitmentOverview";
import {getRecruitmentUiSettings} from "@/lib/recruitment-ui";
import TestConfigManager from "@/components/admin/TestConfigManager";
import {requireAdmin} from "@/lib/admin";

export default async function RecruitmentAdmin(){
  const {supabase,admin}=await requireAdmin();
  const ui=await getRecruitmentUiSettings();
  const [{data:applications},{data:questions},{data:attempts},{data:settings},{data:testCandidates},{data:offers},{data:allJobOffers},{data:generatedExams}]=await Promise.all([
    supabase.from("recruitment_applications").select("*, recruitment_test_attempts(*)").order("created_at",{ascending:false}),
    supabase.from("recruitment_test_questions").select("*").order("position"),
    supabase.from("recruitment_test_attempts").select("*, recruitment_applications(full_name), test_proctoring_logs(*)").order("started_at",{ascending:false}),
    supabase.from("recruitment_test_settings").select("*").eq("id",1).maybeSingle(),
    supabase.from("recruitment_applications").select("id,full_name,email,status,city,country,specialization").in("status",["submitted","under_review","preselected","invited_to_test","test_completed"]).order("full_name"),
    supabase.from("recruitment_job_offers").select("id,title,department,location,status").eq("status","published").order("published_at",{ascending:false}),
    supabase.from("recruitment_job_offers").select("id,title,recruitment_type,status").order("created_at",{ascending:false}),
    supabase.from("recruitment_generated_exams").select("*").order("created_at",{ascending:false}).limit(30),
  ]);

  return <AdminShell name={admin.full_name||admin.email}>
    <div className="mb-7">
      <p className="text-xs font-black uppercase tracking-widest text-leaf">Recrutement · Candidatures</p><h1 className="mt-2 text-4xl font-black">{ui.admin_title}</h1>
      <p className="mt-2 text-slate-500">{ui.admin_intro}</p>
    </div>
    <RecruitmentOverview applications={applications||[]} offers={offers||[]}/>
    <TestConfigManager initialSettings={settings} initialQuestions={questions||[]} candidates={testCandidates||[]} jobOffers={allJobOffers||[]} initialExams={generatedExams||[]}/>
    <RecruitmentManager initial={applications||[]} questions={questions||[]}/>
    <ProctoringSummary attempts={attempts||[]}/>
  </AdminShell>;
}
