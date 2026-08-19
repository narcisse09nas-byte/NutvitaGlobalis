import AdminShell from "@/components/admin/AdminShell";
import RecruitmentQuestionImporter from "@/components/admin/RecruitmentQuestionImporter";
import {requireAdmin} from "@/lib/admin";

export default async function Page(){
  const {supabase,admin}=await requireAdmin();
  const [{data:existing},{data:maximusOffers},{data:nutritionOffers}]=await Promise.all([
    supabase.from("recruitment_test_questions").select("category"),
    supabase.from("maximus_job_offers").select("title_fr,title_en,status").order("created_at",{ascending:false}),
    supabase.from("recruitment_job_offers").select("title,status").order("created_at",{ascending:false}),
  ]);
  const categories=[...new Set([
    ...(existing||[]).map((row:any)=>row.category),
    ...(maximusOffers||[]).flatMap((row:any)=>[row.title_fr,row.title_en]),
    ...(nutritionOffers||[]).map((row:any)=>row.title),
    "Autre (à préciser)",
  ].filter(Boolean))] as string[];
  return <AdminShell name={admin.full_name||admin.email}><RecruitmentQuestionImporter scope="nutritionists" categories={categories}/></AdminShell>;
}
