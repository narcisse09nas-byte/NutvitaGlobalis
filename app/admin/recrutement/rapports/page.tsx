import AdminShell from "@/components/admin/AdminShell";
import RecruitmentReportRegistry from "@/components/admin/RecruitmentReportRegistry";
import {requireAdmin} from "@/lib/admin";

const stages=["submitted","invited_to_test","test_completed","invited_to_interview","selected","integrated"];
export default async function Page(){
  const{supabase,admin}=await requireAdmin();
  const{data}=await supabase.from("recruitment_applications").select("*, recruitment_test_attempts(*), video_interviews(*)").order("updated_at",{ascending:false});
  const applications=data||[];
  return <AdminShell name={admin.full_name||admin.email}><div><h1 className="text-4xl font-black">Rapports de recrutement</h1><p className="mt-2 text-slate-500">Vue consolidée et traçable du parcours des candidats nutritionnistes.</p><section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{stages.map(status=><article key={status} className="rounded-2xl border bg-white p-5"><b className="text-3xl text-forest">{applications.filter((row:any)=>row.status===status).length}</b><p className="mt-2 break-words text-xs font-bold uppercase text-slate-500">{status.replaceAll("_"," ")}</p></article>)}</section><RecruitmentReportRegistry applications={applications}/></div></AdminShell>;
}
