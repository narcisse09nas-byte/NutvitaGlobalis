"use client";

import {
  createBrowserClient,
} from "@supabase/ssr";

import {
  getPublicEnvironment,
} from "@/lib/env";

export function createSupabaseBrowserClient() {
  const environment =
    getPublicEnvironment();

  return createBrowserClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey
  );
}
