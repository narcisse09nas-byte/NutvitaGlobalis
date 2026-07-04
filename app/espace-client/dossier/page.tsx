import ClientShell from "@/components/client/ClientShell";
import NutritionRecord from "@/components/client/NutritionRecord";
import PrescriptionResultsCenter from "@/components/client/PrescriptionResultsCenter";
import { requireHealthAccess } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function NutritionRecordPage() {
  const { supabase, user, profile } = await requireHealthAccess();
  const locale = await getCurrentLocale();
  const partnerId=profile?.assigned_partner_id||profile?.created_by_partner_id||null;
  const [{ data: anthropometry }, { data: biology }, { data: food }, { data: lifestyle }, { data: consultations }, {data:dietary},{data:partnerConsultations},{data:labResults},{data:consents}] = await Promise.all([
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at", { ascending: false }),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at", { ascending: false }),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date", { ascending: false }),
    supabase.from("health_lifestyle_assessments").select("*").eq("client_id", user.id).order("assessment_date", { ascending: false }),
    supabase.from("nutrition_consultations").select("*").eq("client_id", user.id).order("consultation_date", { ascending: false }),
    supabase.from("health_dietary_diversity_assessments").select("*").eq("client_id",user.id).order("assessed_at",{ascending:false}),
    supabase.from("partner_consultations").select("*").eq("client_id",user.id).eq("status","completed").order("finalized_at",{ascending:false}),
    supabase.from("consultation_lab_results").select("*").eq("client_id",user.id).order("performed_at",{ascending:false}),
    partnerId?supabase.from("professional_data_consents").select("*").eq("client_id",user.id).eq("partner_id",partnerId):Promise.resolve({data:[]}),
  ]);
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">{locale === "en" ? "Record my health parameters" : "Enregistrer mes parametres"}</h1><p className="mt-2 text-slate-500">{locale === "en" ? "Your anthropometric, biological, dietary, physical and clinical history." : "Vos historiques anthropometriques, biologiques, alimentaires, physiques et cliniques."}</p></div><NutritionRecord clientId={user.id} anthropometry={anthropometry || []} biology={biology || []} food={food || []} lifestyle={lifestyle || []} consultations={consultations || []} dietary={dietary||[]} locale={locale} /><div className="mt-8"><PrescriptionResultsCenter clientId={user.id} partnerId={partnerId} consultations={partnerConsultations||[]} initialResults={labResults||[]} initialConsents={consents||[]}/></div></ClientShell>;
}
