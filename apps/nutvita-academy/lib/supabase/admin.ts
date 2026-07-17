import {
  createClient,
} from "@supabase/supabase-js";

import {
  getPublicEnvironment,
  getServiceRoleKey,
} from "@/lib/env";

export function createSupabaseAdminClient() {
  const environment =
    getPublicEnvironment();

  return createClient(
    environment.supabaseUrl,
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
