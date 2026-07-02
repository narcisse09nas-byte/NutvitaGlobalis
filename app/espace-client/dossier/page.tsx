import ClientShell from "@/components/client/ClientShell";
import NutritionRecord from "@/components/client/NutritionRecord";
import { requireHealthAccess } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function NutritionRecordPage() {
  const { supabase, user } = await requireHealthAccess();
  const locale = await getCurrentLocale();
  const [{ data: anthropometry }, { data: biology }, { data: food }, { data: lifestyle }, { data: consultations }, {data:dietary}] = await Promise.all([
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at", { ascending: false }),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at", { ascending: false }),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date", { ascending: false }),
    supabase.from("health_lifestyle_assessments").select("*").eq("client_id", user.id).order("assessment_date", { ascending: false }),
    supabase.from("nutrition_consultations").select("*").eq("client_id", user.id).order("consultation_date", { ascending: false }),
    supabase.from("health_dietary_diversity_assessments").select("*").eq("client_id",user.id).order("assessed_at",{ascending:false}),
  ]);
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">{locale === "en" ? "Record my health parameters" : "Enregistrer mes parametres"}</h1><p className="mt-2 text-slate-500">{locale === "en" ? "Your anthropometric, biological, dietary, physical and clinical history." : "Vos historiques anthropometriques, biologiques, alimentaires, physiques et cliniques."}</p></div><NutritionRecord clientId={user.id} anthropometry={anthropometry || []} biology={biology || []} food={food || []} lifestyle={lifestyle || []} consultations={consultations || []} dietary={dietary||[]} locale={locale} /></ClientShell>;
}
