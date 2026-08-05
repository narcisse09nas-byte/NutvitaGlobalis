import { createClient } from "@/lib/supabase/server";
import { defaultHealthRecordPageSettings, type HealthRecordPageSettings } from "@/data/health-record-page";

export async function getHealthRecordPageSettings(): Promise<HealthRecordPageSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("health_record_page_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return defaultHealthRecordPageSettings;
    return { ...defaultHealthRecordPageSettings, ...data, advice: Array.isArray(data.advice) ? data.advice : defaultHealthRecordPageSettings.advice };
  } catch {
    return defaultHealthRecordPageSettings;
  }
}
