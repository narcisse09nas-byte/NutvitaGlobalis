"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightStartOnRectangleIcon, ChartBarIcon, ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon, ClipboardDocumentListIcon, CreditCardIcon,
  DocumentCheckIcon, HomeIcon, KeyIcon, LockClosedIcon, QrCodeIcon, ShieldCheckIcon, SparklesIcon,
  UserCircleIcon, UserGroupIcon, VideoCameraIcon,
} from "@heroicons/react/24/outline";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HelpBox from "@/components/shared/HelpBox";
import type { ClientEntitlements } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";

type LinkItem = readonly [string, string, typeof HomeIcon, boolean];

export default function ClientShellClient({ children, email, access, activeService, english = false }: { children: ReactNode; email: string; access: ClientEntitlements; activeService: string; english?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const common: LinkItem[] = [
    ["/espace-client", english ? "Dashboard" : "Tableau de bord", HomeIcon, true],
    ["/espace-client/services", english ? "Our services" : "Nos services", CreditCardIcon, true],
    ["/espace-client/abonnement", english ? "My subscriptions" : "Mes abonnements", CreditCardIcon, true],
    ["/espace-client/profil", english ? "My profile" : "Mon profil", UserCircleIcon, true],
    ["/espace-client/carte", english ? "My access card" : "Ma carte d'accès", QrCodeIcon, true],
    ["/espace-client/securite", english ? "Password" : "Mot de passe", KeyIcon, true],
    ["/espace-client/confidentialite", english ? "Privacy" : "Confidentialité", ShieldCheckIcon, true],
    ["/espace-client/ressources-premium", english ? "Premium resources" : "Ressources premium", LockClosedIcon, access.premiumResources],
  ];
  const health: LinkItem[] = [
    ["/espace-client/dossier", "Mes parametres", ClipboardDocumentListIcon, access.health],
    ["/espace-client/tendances", "Tendances", ChartBarIcon, access.health],
    ["/espace-client/analyse", "Analyse et rapports", SparklesIcon, access.health],
    ["/espace-client/consentements-sante", "Consentement de partage", ClipboardDocumentCheckIcon, access.health],
    ["/espace-client/ordonnances", "Mes ordonnances", DocumentCheckIcon, access.health],
    ["/espace-client/resultats-laboratoire", "Resultats de laboratoire", DocumentCheckIcon, access.health],
  ];
  const childGrowth: LinkItem[] = [
    ["/espace-client/croissance-enfant", "Croissance enfant", UserGroupIcon, access.childGrowth],
  ];
  const teleconsultation: LinkItem[] = [
    ["/espace-client/consultations", english ? "Dashboard" : "Tableau de bord", HomeIcon, access.teleconsultation],
    ["/rendez-vous", english ? "Appointments" : "Rendez-vous", ClipboardDocumentCheckIcon, access.teleconsultation],
    ["/espace-client/messages", "Messages", ChatBubbleLeftRightIcon, access.teleconsultation],
    ["/espace-client/appels", english ? "Teleconsultations" : "Téléconsultations", VideoCameraIcon, access.teleconsultation],
    ["/espace-client/dossier", english ? "My follow-up" : "Mon suivi", ClipboardDocumentListIcon, access.health],
    ["/espace-client/tendances", english ? "My progress" : "Mes progrès", ChartBarIcon, access.health],
    ["/espace-client/ordonnances", english ? "My documents" : "Mes documents", DocumentCheckIcon, access.teleconsultation],
    ["/espace-client/resultats-laboratoire", english ? "Measurements and results" : "Mesures et résultats", DocumentCheckIcon, access.health],
    ["/espace-client/abonnement", english ? "Payments and invoices" : "Paiements et factures", CreditCardIcon, true],
    ["/espace-client/profil", english ? "Settings" : "Paramètres", UserCircleIcon, true],
    ["/support", english ? "Help and support" : "Aide et support", ShieldCheckIcon, true],
  ];
  const catering: LinkItem[] = [
    ["/restauration/commander", "Commander un repas", CreditCardIcon, true],
  ];
  const commonPaths = ["/espace-client", "/espace-client/services", "/espace-client/abonnement", "/espace-client/profil", "/espace-client/carte", "/espace-client/securite", "/espace-client/confidentialite", "/espace-client/ressources-premium"];
  const serviceLinks = commonPaths.includes(path) ? common : activeService === "health" ? health : activeService === "child_growth" ? childGrowth : activeService === "teleconsultation" ? teleconsultation : activeService === "catering" ? catering : common;
  const healthMode = activeService === "health" || activeService === "child_growth";

  async function logout() {
    await createClient().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return <div className="min-h-screen bg-slate-100">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
      <Link href="/espace-client" className="text-xl font-black text-forest">NutVita<span className="text-orange">{activeService === "health" ? "Sante" : activeService === "child_growth" ? "Croissance" : activeService === "teleconsultation" ? "Consultations" : activeService === "catering" ? "Restauration" : "Client"}</span></Link>
      <div className="flex items-center gap-3"><Link href="/" className="rounded-xl border px-3 py-2 text-sm font-black text-forest hover:bg-mint">{english ? "Main website" : "Page principale"}</Link><LanguageSwitcher compact/><span className="hidden text-sm text-slate-500 sm:block">{email}</span><button onClick={logout} className="flex gap-2 text-sm font-bold"><ArrowRightStartOnRectangleIcon className="h-5"/>{english ? "Sign out" : "Déconnexion"}</button></div>
    </div></header>
    {healthMode && <MedicalDisclaimer/>}
    <div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[270px_1fr]">
      <nav className="flex flex-col self-stretch rounded-3xl bg-forest p-4 text-white">
        <Link href="/espace-client" className="mb-3 flex gap-3 rounded-xl bg-white/10 px-4 py-3 font-bold hover:bg-white/15"><SparklesIcon className="h-5"/>{english ? "Change service" : "Changer de service"}</Link>
        {serviceLinks.filter(([, , , visible]) => visible).map(([href, label, Icon]) => <Link key={href} href={href} className={`flex gap-3 rounded-xl px-4 py-3 font-bold ${path === href ? "bg-white/15" : "hover:bg-white/10"}`}><Icon className="h-5"/>{label}</Link>)}
        <div className="mt-auto pt-4"><HelpBox text={english ? "Our team is here to support you." : "Notre équipe est là pour vous accompagner."} label={english ? "Contact us" : "Contactez-nous"} /></div>
      </nav>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
