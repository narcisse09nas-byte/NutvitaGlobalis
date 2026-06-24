export const locales = ["fr", "en"] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = "fr";

export const localeLabels: Record<Locale, string> = { fr: "FR", en: "EN" };

export const routeAliases: Record<Locale, Record<string, string>> = {
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

const canonicalToLocalized = Object.fromEntries(
  locales.map(locale => [locale, Object.fromEntries(Object.entries(routeAliases[locale]).map(([localized, canonical]) => [canonical, localized]))]),
) as Record<Locale, Record<string, string>>;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en";
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function stripLocale(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (isLocale(maybeLocale)) return { locale: maybeLocale, pathname: `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/" };
  return { locale: null, pathname };
}

export function canonicalPath(locale: Locale, localizedPath: string) {
  const clean = localizedPath === "" ? "/" : localizedPath;
  return routeAliases[locale][clean] || clean;
}

export function localizedPath(locale: Locale, canonical: string) {
  const [path, query = ""] = canonical.split("?");
  const clean = path || "/";
  const localized = canonicalToLocalized[locale][clean] || clean;
  const prefix = locale === defaultLocale ? "/fr" : "/en";
  return `${prefix}${localized === "/" ? "" : localized}${query ? `?${query}` : ""}` || prefix;
}

export function pickLocalized<T extends Record<string, any>>(row: T, field: string, locale: Locale) {
  if (locale === "en") return row[`${field}_en`] || row[field];
  return row[field];
}

export const ui = {
  fr: {
    nav: {
      home: "Accueil",
      health: "Suivi Sante",
      courses: "Formations",
      counselling: "Teleconseils",
      resources: "Ressources",
      recruitment: "Recrutement",
      about: "A propos",
      contact: "Contact",
      login: "Se connecter",
    },
    footer: {
      promise: "Des connaissances fiables et un accompagnement humain pour une meilleure sante nutritionnelle.",
      explore: "Explorer",
      access: "Acces",
      chooseSpace: "Choisir mon espace",
      clientArea: "Espace client",
      candidate: "Candidat / partenaire",
      admin: "Administration",
      privacy: "Politique de confidentialite",
      rights: "Tous droits reserves.",
    },
  },
  en: {
    nav: {
      home: "Home",
      health: "Health tracking",
      courses: "Courses",
      counselling: "Nutrition counselling",
      resources: "Resources",
      recruitment: "Recruitment",
      about: "About",
      contact: "Contact",
      login: "Sign in",
    },
    footer: {
      promise: "Reliable knowledge and human support for better nutritional health.",
      explore: "Explore",
      access: "Access",
      chooseSpace: "Choose my space",
      clientArea: "Client area",
      candidate: "Candidate / partner",
      admin: "Administration",
      privacy: "Privacy policy",
      rights: "All rights reserved.",
    },
  },
} as const;
