import {
  cookies,
} from "next/headers";

import {
  createServerClient,
} from "@supabase/ssr";

import {
  getPublicEnvironment,
} from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore =
    await cookies();

  const environment =
    getPublicEnvironment();

  return createServerClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            // Les Server Components ne peuvent pas toujours écrire les cookies.
          }
        },
      },
    }
  );
}
