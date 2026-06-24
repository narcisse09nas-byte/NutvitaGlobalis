import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const access: Record<string, string[]> = {
  "/admin/utilisateurs-admin": ["super_admin"],
  "/admin/utilisateurs": ["super_admin"],
  "/admin/personnel": ["super_admin"],
  "/admin/emails-systeme": ["super_admin"],
  "/admin/contrats": ["super_admin"],
  "/admin/juridique": ["super_admin"],
  "/admin/audit": ["super_admin"],
  "/admin/dashboard-business": ["super_admin", "finance_admin"],
  "/admin/articles": ["super_admin", "content_admin"],
  "/admin/formations": ["super_admin", "content_admin"],
  "/admin/ressources-premium": ["super_admin", "content_admin"],
  "/admin/accueil": ["super_admin", "content_admin"],
  "/admin/temoignages": ["super_admin", "content_admin"],
  "/admin/newsletter": ["super_admin", "content_admin"],
  "/admin/recrutement": ["super_admin", "recruitment_admin"],
  "/admin/dieteticiens": ["super_admin", "recruitment_admin"],
  "/admin/croissance-enfant": ["super_admin", "health_admin"],
  "/admin/sante": ["super_admin", "health_admin"],
  "/admin/teleconseils": ["super_admin", "health_admin"],
  "/admin/paiements": ["super_admin", "finance_admin"],
  "/admin/paiements-partenaires": ["super_admin", "finance_admin"],
  "/admin/depenses": ["super_admin", "finance_admin"],
  "/admin/factures": ["super_admin", "finance_admin"],
  "/admin/taxes": ["super_admin", "finance_admin"],
  "/admin/offres": ["super_admin", "finance_admin"],
  "/admin/fosa": ["super_admin", "health_admin"],
};

const aliases: Record<string, Record<string, string>> = {
  fr: {
    "/": "/",
    "/services": "/services",
    "/formations": "/formations",
    "/teleconseils": "/teleconseils",
    "/ressources": "/ressources",
    "/suivi-sante": "/suivi-sante",
    "/recrutement-dieteticiens": "/recrutement-dieteticiens",
    "/a-propos": "/a-propos",
    "/contact": "/contact",
    "/acces": "/acces",
    "/confidentialite": "/confidentialite",
    "/cgu": "/cgu",
    "/cgv": "/cgv",
    "/remboursement": "/remboursement",
    "/fosa": "/fosa",
  },
  en: {
    "/": "/",
    "/our-services": "/services",
    "/courses": "/formations",
    "/nutrition-counselling": "/teleconseils",
    "/resources": "/ressources",
    "/health-tracking": "/suivi-sante",
    "/dietitian-recruitment": "/recrutement-dieteticiens",
    "/about": "/a-propos",
    "/contact": "/contact",
    "/access": "/acces",
    "/privacy": "/confidentialite",
    "/terms-of-use": "/cgu",
    "/terms-of-sale": "/cgv",
    "/refund-policy": "/remboursement",
    "/fosa": "/fosa",
  },
};

function localizedRequest(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/");
  const locale = segments[1] === "en" || segments[1] === "fr" ? segments[1] : null;
  if (!locale) return { locale: request.cookies.get("nutvita_locale")?.value || "fr", pathname: request.nextUrl.pathname, rewrite: null as URL | null };
  const localizedPath = `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/";
  const canonical = aliases[locale][localizedPath] || localizedPath;
  const rewrite = request.nextUrl.clone();
  rewrite.pathname = canonical;
  return { locale, pathname: canonical, rewrite };
}

export async function middleware(request: NextRequest) {
  const localized = localizedRequest(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = localized.rewrite ? NextResponse.rewrite(localized.rewrite) : NextResponse.next({ request });
  response.cookies.set("nutvita_locale", localized.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  if (process.env.NEXT_PUBLIC_LOCAL_ADMIN_MODE === "true" && (!url || !key)) {
    if (localized.pathname.startsWith("/admin") && localized.pathname !== "/admin" && request.cookies.get("nutvita_local_admin")?.value !== "1") return NextResponse.redirect(new URL("/admin", request.url));
    return response;
  }
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = localized.rewrite ? NextResponse.rewrite(localized.rewrite) : NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.cookies.set("nutvita_locale", localized.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  if (localized.pathname.startsWith("/admin") && localized.pathname !== "/admin") {
    if (!user) return NextResponse.redirect(new URL("/admin", request.url));
    const { data: admin } = await supabase.from("admin_users").select("role,active").eq("id", user.id).maybeSingle();
    if (!admin?.active) return NextResponse.redirect(new URL("/admin?unauthorized=1", request.url));
    const rule = Object.entries(access).sort(([a], [b]) => b.length - a.length).find(([prefix]) => localized.pathname.startsWith(prefix));
    if (rule && !rule[1].includes(admin.role)) return NextResponse.redirect(new URL("/admin?acces=refuse", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
