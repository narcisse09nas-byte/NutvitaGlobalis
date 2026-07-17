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
  "/super-admin/nutritrack": ["super_admin"],
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
    "/fosa": "/nutritrack",
    "/nutritrack": "/nutritrack",
    "/acces-nutritrack": "/acces-nutritrack",
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
    "/fosa": "/nutritrack",
    "/nutritrack": "/nutritrack",
    "/nutritrack-access": "/acces-nutritrack",
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

type SessionRule = { services: string[]; roles: string[] };

function activeSessionRule(pathname: string): SessionRule | null {
  const starts = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (starts("/academy/dashboard/admin")) return { services: ["academy"], roles: ["admin"] };
  if (starts("/academy/dashboard/instructor")) return { services: ["academy"], roles: ["instructor"] };
  if (starts("/academy/dashboard") || starts("/academy/learn") || starts("/academy/enroll")) return { services: ["academy"], roles: ["student"] };
  if (starts("/academy") && !starts("/academy/auth")) return { services: ["academy"], roles: ["student", "instructor", "admin"] };

  if (starts("/espace-client/croissance-enfant")) return { services: ["child_growth"], roles: ["client"] };
  if (["/espace-client/consultations", "/espace-client/messages", "/espace-client/appels"].some(starts)) return { services: ["teleconsultation"], roles: ["client"] };
  if (["/espace-client/dossier", "/espace-client/tendances", "/espace-client/analyse"].some(starts)) return { services: ["health"], roles: ["client"] };
  if (starts("/espace-client")) return { services: ["client"], roles: ["client"] };

  if (starts("/partenaire") && pathname !== "/partenaire/connexion") return { services: ["health", "child_growth", "teleconsultation"], roles: ["nutritionist"] };
  if (starts("/candidat")) return { services: ["recruitment"], roles: ["candidate"] };
  if (starts("/surveys")) return { services: ["survey"], roles: ["client", "admin"] };
  if (starts("/op-management")) return { services: ["project_management"], roles: ["client", "admin"] };
  if (starts("/nutritrack")) return { services: ["nutritrack"], roles: ["client", "admin"] };
  if (starts("/maximus") && pathname !== "/maximus/login") return { services: ["maximus"], roles: ["staff", "admin"] };

  if (starts("/admin/sante")) return { services: ["health"], roles: ["admin"] };
  if (starts("/admin/croissance-enfant")) return { services: ["child_growth"], roles: ["admin"] };
  if (starts("/admin/teleconseils")) return { services: ["teleconsultation"], roles: ["admin"] };
  if (starts("/admin/recrutement") || starts("/admin/dieteticiens")) return { services: ["recruitment"], roles: ["admin"] };
  if ((starts("/admin") && pathname !== "/admin") || starts("/super-admin")) return { services: ["administration"], roles: ["super_admin"] };

  if (starts("/api/admin")) return { services: ["administration"], roles: ["super_admin"] };
  if (starts("/api/partner")) return { services: ["health", "child_growth", "teleconsultation"], roles: ["nutritionist"] };
  if (starts("/api/maximus")) return { services: ["maximus"], roles: ["staff", "admin"] };
  if (starts("/api/consultations")) return { services: ["health", "teleconsultation"], roles: ["client", "nutritionist", "admin"] };
  return null;
}

export async function middleware(request: NextRequest) {
  const localized = localizedRequest(request);
  const response = localized.rewrite ? NextResponse.rewrite(localized.rewrite) : NextResponse.next({ request });
  response.cookies.set("nutvita_locale", localized.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  if (process.env.NEXT_PUBLIC_LOCAL_ADMIN_MODE === "true") {
    if (localized.pathname.startsWith("/admin") && localized.pathname !== "/admin" && request.cookies.get("nutvita_local_admin")?.value !== "1") return NextResponse.redirect(new URL("/admin", request.url));
    return response;
  }

  const sessionRule = activeSessionRule(localized.pathname);
  if (sessionRule) {
    const service = request.cookies.get("nutvita_active_service")?.value;
    const role = request.cookies.get("nutvita_active_role")?.value;
    const allowed = sessionRule.services.includes(service || "") && sessionRule.roles.includes(role || "");
    if (!allowed) {
      if (localized.pathname.startsWith("/api/")) return NextResponse.json({ message: "Le mode de session actif ne permet pas cette action." }, { status: 403 });
      const chooser = new URL("/choisir-acces", request.url);
      chooser.searchParams.set("erreur", "mode_session_requis");
      return NextResponse.redirect(chooser);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
