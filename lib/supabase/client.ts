import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import { hasLocalAdminMode } from "./config";
import { createLocalClient } from "./local";

export function createClient(): SupabaseClient {
  if (hasLocalAdminMode()) return createLocalClient() as SupabaseClient;
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
