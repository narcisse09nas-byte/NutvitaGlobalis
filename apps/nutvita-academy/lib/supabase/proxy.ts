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

function academyRoleRule(pathname: string, method: string): string[] | null {
  const path = pathname.startsWith("/academy/") ? pathname.slice("/academy".length) : pathname;
  if (path.startsWith("/auth/")) return null;
  if (path.startsWith("/dashboard/admin")) return ["admin"];
  if (path.startsWith("/dashboard/instructor")) return ["instructor"];
  if (path.startsWith("/dashboard") || path.startsWith("/learn/") || path.startsWith("/enroll/")) return ["student"];
  if (path.startsWith("/api/certificates/publish")) return ["admin"];
  if (path.startsWith("/api/studio/")) return ["instructor", "admin"];
  if (path === "/api/live" && method !== "GET") return ["instructor", "admin"];
  if (path.startsWith("/api/payments/") || path.startsWith("/api/orders")) return ["student"];
  return null;
}

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
  const allowedRoles = academyRoleRule(request.nextUrl.pathname, request.method);
  if (user && allowedRoles) {
    const activeService = request.cookies.get("nutvita_active_service")?.value;
    const activeRole = request.cookies.get("nutvita_active_role")?.value;
    const { data: latest } = await supabase.from("platform_session_selections").select("service_key,role_key,selected_at").eq("user_id", user.id).gte("selected_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()).order("selected_at", { ascending: false }).limit(1).maybeSingle();
    const permitted = Boolean(latest && latest.service_key === "academy" && latest.service_key === activeService && latest.role_key === activeRole && allowedRoles.includes(activeRole || ""));
    if (!permitted) {
      if (request.nextUrl.pathname.includes("/api/")) return NextResponse.json({ error: "Le role Academy actif ne permet pas cette action." }, { status: 403 });
      const platformOrigin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.replace(/\/$/, "") || request.nextUrl.origin;
      return NextResponse.redirect(new URL("/choisir-acces?erreur=mode_academy_requis", platformOrigin));
    }
  }


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
    !request.nextUrl.pathname.includes("/callback") &&
    !request.nextUrl.pathname.includes("/platform")
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
