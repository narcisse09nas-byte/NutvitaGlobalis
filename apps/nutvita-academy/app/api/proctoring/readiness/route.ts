import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getProctoringReadiness } from "@/lib/proctoring/identity-engine";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  let migrationApplied = false;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("proctoring_settings")
      .select("id")
      .eq("id", true)
      .maybeSingle();
    migrationApplied = !error;
  }

  return Response.json(getProctoringReadiness(migrationApplied), {
    headers: { "Cache-Control": "no-store" },
  });
}
