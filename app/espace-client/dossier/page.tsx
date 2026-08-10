import ClientShell from "@/components/client/ClientShell";
import HealthRecordWorkspace from "@/components/client/HealthRecordWorkspace";
import { requireHealthAccess } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getHealthRecordPageSettings } from "@/lib/health-record-page";

export default async function NutritionRecordPage() {
  const { supabase, user, profile } = await requireHealthAccess();
  const locale = await getCurrentLocale();
  const partnerId = profile?.assigned_partner_id || profile?.created_by_partner_id || null;
  const [{ data: anthropometry }, { data: biology }, { data: food }, { data: lifestyle }, { data: consultations }, { data: dietary }, settings] = await Promise.all([
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at", { ascending: false }),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at", { ascending: false }),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date", { ascending: false }),
    supabase.from("health_lifestyle_assessments").select("*").eq("client_id", user.id).order("assessment_date", { ascending: false }),
    supabase.from("partner_consultations").select("*").eq("client_id", user.id).eq("status", "completed").order("finalized_at", { ascending: false }),
    supabase.from("health_dietary_diversity_assessments").select("*").eq("client_id", user.id).order("assessed_at", { ascending: false }),
    getHealthRecordPageSettings(),
  ]);
  void partnerId;
  return <ClientShell email={user.email || ""} service="health"><HealthRecordWorkspace clientId={user.id} anthropometry={anthropometry || []} biology={biology || []} food={food || []} lifestyle={lifestyle || []} consultations={consultations || []} dietary={dietary || []} locale={locale} settings={settings}/></ClientShell>;
}