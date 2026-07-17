export const PLATFORM_PRINCIPAL_EMAILS = [
  "pauln.zebaze@gmail.com",
  "contact@nutvitaglobalis.com",
] as const;

export type PlatformServiceKey = "client" | "academy" | "health" | "child_growth" | "teleconsultation" | "recruitment" | "nutritrack" | "maximus" | "administration";
export type PlatformRole = "client" | "candidate" | "student" | "nutritionist" | "instructor" | "staff" | "admin" | "super_admin";

export type PlatformService = {
  key: PlatformServiceKey;
  title: string;
  description: string;
  roles: Array<{ key: PlatformRole; label: string; href: string }>;
};

export const platformServices: PlatformService[] = [
  { key: "client", title: "Espace client", description: "Achats, factures, profil et services actifs.", roles: [{ key: "client", label: "Client", href: "/espace-client" }] },
  { key: "academy", title: "NutVitaGlobalis Academy", description: "Formations, évaluations, classes et certificats.", roles: [
    { key: "student", label: "Apprenant", href: "/academy/dashboard" },
    { key: "instructor", label: "Formateur", href: "/academy/dashboard/instructor" },
    { key: "admin", label: "Administration Academy", href: "/academy/dashboard/admin" },
  ] },
  { key: "health", title: "Suivi santé", description: "Dossier, tendances, analyses et rapports.", roles: [{ key: "client", label: "Client", href: "/espace-client/dossier" }, { key: "nutritionist", label: "Nutritionniste", href: "/partenaire/clients" }, { key: "admin", label: "Administration santé", href: "/admin/sante" }] },
  { key: "child_growth", title: "Croissance enfant", description: "Mesures, courbes et analyses pédiatriques.", roles: [{ key: "client", label: "Parent", href: "/espace-client/croissance-enfant" }, { key: "nutritionist", label: "Nutritionniste", href: "/partenaire/clients" }, { key: "admin", label: "Administration croissance", href: "/admin/croissance-enfant" }] },
  { key: "teleconsultation", title: "Téléconseils", description: "Consultations, messages et appels vidéo.", roles: [{ key: "client", label: "Client", href: "/espace-client/consultations" }, { key: "nutritionist", label: "Nutritionniste", href: "/partenaire/consultations" }, { key: "admin", label: "Administration téléconseils", href: "/admin/teleconseils" }] },
  { key: "recruitment", title: "Candidatures", description: "Dossier et suivi de candidature.", roles: [{ key: "candidate", label: "Candidat", href: "/candidat" }, { key: "admin", label: "Administration recrutement", href: "/admin/recrutement" }] },
  { key: "nutritrack", title: "NutriTrack", description: "Prise en charge et pilotage de la malnutrition.", roles: [{ key: "client", label: "Utilisateur terrain", href: "/nutritrack" }, { key: "admin", label: "Administration NutriTrack", href: "/super-admin/nutritrack" }] },
  { key: "maximus", title: "Maximus", description: "Gestion interne du cabinet.", roles: [{ key: "staff", label: "Membre du personnel", href: "/maximus" }, { key: "admin", label: "Administration Maximus", href: "/maximus" }] },
  { key: "administration", title: "Administration NutVitaGlobalis", description: "Configuration et contrôle transversal de la plateforme.", roles: [{ key: "admin", label: "Administrateur", href: "/admin" }] },
];

export function isPrincipalEmail(email?: string | null) {
  return PLATFORM_PRINCIPAL_EMAILS.includes(String(email || "").trim().toLowerCase() as (typeof PLATFORM_PRINCIPAL_EMAILS)[number]);
}

export function findPlatformRole(service: string, role: string) {
  return platformServices.find(item => item.key === service)?.roles.find(item => item.key === role);
}
