import AdminShell from "@/components/admin/AdminShell";
import TestConfigManager from "@/components/admin/TestConfigManager";
import {requireAdmin} from "@/lib/admin";

export default async function Page(){
  const {supabase,admin}=await requireAdmin();
  const [{data:questions},{data:settings},{data:candidates},{data:offers},{data:exams}]=await Promise.all([
    supabase.from("recruitment_test_questions").select("*").order("position"),
    supabase.from("recruitment_test_settings").select("*").eq("id",1).maybeSingle(),
    supabase.from("recruitment_applications").select("id,full_name,email,status,city,country,specialization,assigned_exam_id,recruitment_test_attempts(*)").order("full_name"),
    supabase.from("recruitment_job_offers").select("id,title,recruitment_type,status").order("created_at",{ascending:false}),
    supabase.from("recruitment_generated_exams").select("*").order("created_at",{ascending:false}),
  ]);
  return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Recrutement des nutritionnistes</p><h1 className="mt-2 text-4xl font-black">Tests écrits</h1><p className="mt-2 text-slate-500">Conception, génération, attribution et correction des épreuves.</p></div><TestConfigManager initialSettings={settings} initialQuestions={questions||[]} candidates={candidates||[]} jobOffers={offers||[]} initialExams={exams||[]}/></AdminShell>;
}
