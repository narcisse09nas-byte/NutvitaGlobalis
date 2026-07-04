import ClientShell from "@/components/client/ClientShell";
import PrescriptionResultsCenter from "@/components/client/PrescriptionResultsCenter";
import { requireClient } from "@/lib/client";

export default async function PrescriptionsPage(){
  const {supabase,user,profile}=await requireClient();
  const partnerId=profile?.assigned_partner_id||profile?.created_by_partner_id||null;
  const [{data:consultations},{data:results},{data:consents}]=await Promise.all([
    supabase.from("partner_consultations").select("*").eq("client_id",user.id).eq("status","completed").order("finalized_at",{ascending:false}),
    supabase.from("consultation_lab_results").select("*").eq("client_id",user.id).order("performed_at",{ascending:false}),
    partnerId?supabase.from("professional_data_consents").select("*").eq("client_id",user.id).eq("partner_id",partnerId):Promise.resolve({data:[]}),
  ]);
  return <ClientShell email={user.email||""}><div className="mb-7"><h1 className="text-3xl font-black">Ordonnances et resultats</h1><p className="mt-2 text-slate-500">Consultez vos ordonnances, renseignez les resultats du laboratoire et controlez leur partage.</p></div><PrescriptionResultsCenter clientId={user.id} partnerId={partnerId} consultations={consultations||[]} initialResults={results||[]} initialConsents={consents||[]}/></ClientShell>
}
