import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createServerClient,
} from "@supabase/ssr";

import {
  getPublicEnvironment,
} from "@/lib/env";

export async function updateSession(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });

  const environment =
    getPublicEnvironment();

  const supabase =
    createServerClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  const isDashboardRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/academy/dashboard");

  const isAuthRoute =
    request.nextUrl.pathname.startsWith(
      "/auth"
    );

  if (
    isDashboardRoute &&
    !user
  ) {
    const platformOrigin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.replace(/\/$/, "") || request.nextUrl.origin;
    const url = new URL("/connexion", platformOrigin);
    url.searchParams.set("redirect", "/choisir-acces");

    return NextResponse.redirect(
      url
    );
  }

  if (
    isAuthRoute &&
    user &&
    !request.nextUrl.pathname.includes(
      "/callback"
    )
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/dashboard";

    return NextResponse.redirect(
      url
    );
  }

  return response;
}
