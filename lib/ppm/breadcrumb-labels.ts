import type { Locale } from "@/lib/i18n";

// Bilingual retrofit: the ~10 breadcrumb segment labels that recur across all 47 PPM pages,
// so each page swaps a hardcoded string for bc(locale, "key") instead of hand-writing a ternary.
const SEGMENTS = {
  overview: { fr: "Vue d'ensemble", en: "Overview" },
  organizations: { fr: "Organisations", en: "Organizations" },
  portfolios: { fr: "Portefeuilles", en: "Portfolios" },
  programs: { fr: "Programmes", en: "Programs" },
  projects: { fr: "Projets", en: "Projects" },
  team: { fr: "Equipe", en: "Team" },
  scoping: { fr: "Cadrage", en: "Scoping" },
  planning: { fr: "Planification", en: "Planning" },
  implementation: { fr: "Mise en oeuvre", en: "Implementation" },
  monitoring: { fr: "Suivi & controle", en: "Monitoring & Control" },
  reporting: { fr: "Reporting", en: "Reporting" },
  closure: { fr: "Cloture", en: "Closure" },
  myAccount: { fr: "Mon compte", en: "My account" },
} as const;

export function bc(locale: Locale, key: keyof typeof SEGMENTS): string {
  return SEGMENTS[key][locale];
}
