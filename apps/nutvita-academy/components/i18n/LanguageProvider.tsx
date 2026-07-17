"use client";

import { createContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "fr" | "en";

const messages = {
  fr: {
    dashboard: "Tableau de bord",
    courses: "Mes formations",
    live: "Classes virtuelles",
    finalExams: "Examens finaux",
    scheduleExam: "Planifier un examen",
    rewards: "Récompenses",
    certificates: "Certificats",
    catalog: "Catalogue",
    cart: "Panier",
    wishlist: "Liste de souhaits",
    orders: "Mes commandes",
    organizations: "Mes organisations",
    organizationSpace: "Espace organisation",
    members: "Membres",
    invitations: "Invitations",
    documents: "Documents",
    notifications: "Notifications",
    instructorStudio: "Studio formateur",
    proctoring: "Surveillance examens",
    instructorSessions: "Sessions formateur",
    instructorRevenue: "Revenus formateur",
    grades: "Notes et résultats",
    administration: "Administration",
    users: "Utilisateurs",
    profile: "Mon profil",
    notes: "Mes notes",
    history: "Historique",
    settings: "Paramètres",
    support: "Assistance",
    learning: "Apprentissage",
    marketplace: "Marketplace",
    organization: "Organisation",
    resources: "Ressources",
    studioAdmin: "Studio et administration",
    account: "Compte",
    search: "Rechercher une formation…",
    learnerSpace: "Espace apprenant",
    instructorSpace: "Espace formateur",
    adminSpace: "Espace administration",
    changeSpace: "Changer d’espace",
    email: "Email",
    password: "Mot de passe",
    remember: "Se souvenir de moi",
    forgotPassword: "Mot de passe oublié ?",
    signIn: "Se connecter",
    signingIn: "Connexion en cours…",
    noAccount: "Pas encore de compte ?",
    createAccount: "Créer un compte",
    loginError: "Connexion impossible",
    chooseSpace: "Dans quel espace souhaitez-vous travailler ?",
    language: "Langue",
  },
  en: {
    dashboard: "Dashboard",
    courses: "My courses",
    live: "Virtual classes",
    finalExams: "Final exams",
    scheduleExam: "Schedule an exam",
    rewards: "Rewards",
    certificates: "Certificates",
    catalog: "Catalog",
    cart: "Cart",
    wishlist: "Wishlist",
    orders: "My orders",
    organizations: "My organizations",
    organizationSpace: "Organization space",
    members: "Members",
    invitations: "Invitations",
    documents: "Documents",
    notifications: "Notifications",
    instructorStudio: "Instructor Studio",
    proctoring: "Exam proctoring",
    instructorSessions: "Instructor sessions",
    instructorRevenue: "Instructor revenue",
    grades: "Grades and results",
    administration: "Administration",
    users: "Users",
    profile: "My profile",
    notes: "My notes",
    history: "History",
    settings: "Settings",
    support: "Support",
    learning: "Learning",
    marketplace: "Marketplace",
    organization: "Organization",
    resources: "Resources",
    studioAdmin: "Studio and administration",
    account: "Account",
    search: "Search for a course…",
    learnerSpace: "Learner space",
    instructorSpace: "Instructor space",
    adminSpace: "Administration space",
    changeSpace: "Switch workspace",
    email: "Email",
    password: "Password",
    remember: "Remember me",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signingIn: "Signing in…",
    noAccount: "New to the Academy?",
    createAccount: "Create an account",
    loginError: "Unable to sign in",
    chooseSpace: "Which workspace would you like to use?",
    language: "Language",
  },
} as const;

export type MessageKey = keyof typeof messages.fr;
type ContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
  text: (fr: string, en: string) => string;
};
export const LanguageContext = createContext<ContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("fr");
  useEffect(() => {
    const stored = window.localStorage.getItem("nutvita-language");
    const initial: AppLocale =
      stored === "en" ||
      (!stored && navigator.language.toLowerCase().startsWith("en"))
        ? "en"
        : "fr";
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);
  function setLocale(next: AppLocale) {
    setLocaleState(next);
    window.localStorage.setItem("nutvita-language", next);
    document.documentElement.lang = next;
  }
  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: MessageKey) => messages[locale][key],
      text: (fr: string, en: string) => (locale === "fr" ? fr : en),
    }),
    [locale],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
