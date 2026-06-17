"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightStartOnRectangleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  HomeIcon,
  KeyIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { ClientEntitlements } from "@/lib/client";
import { createClient } from "@/lib/supabase/client";

type LinkItem = readonly [string, string, typeof HomeIcon, boolean];

export default function ClientShellClient({ children, email, access }: { children: ReactNode; email: string; access: ClientEntitlements }) {
  const router = useRouter();
  const path = usePathname();
  const links: LinkItem[] = [
    ["/espace-client", "Tableau de bord", HomeIcon, true],
    ["/espace-client/services", "Acheter un service", CreditCardIcon, true],
    ["/espace-client/profil", "Mon profil", UserCircleIcon, true],
    ["/espace-client/dossier", "Dossier nutritionnel", ClipboardDocumentListIcon, access.health],
    ["/espace-client/tendances", "Tendances", ChartBarIcon, access.health],
    ["/espace-client/analyse", "Analyse et rapports", SparklesIcon, access.health],
    ["/espace-client/abonnement", "Mes abonnements", CreditCardIcon, true],
    ["/espace-client/croissance-enfant", "Croissance enfant", UserGroupIcon, access.childGrowth],
    ["/espace-client/messages", "Messages", ChatBubbleLeftRightIcon, access.health || access.teleconsultation],
    ["/espace-client/appels", "Appels video", VideoCameraIcon, access.teleconsultation],
    ["/espace-client/contrats", "Contrats et consentements", DocumentCheckIcon, true],
    ["/espace-client/confidentialite", "Confidentialite", ShieldCheckIcon, true],
    ["/espace-client/securite", "Mot de passe", KeyIcon, true],
  ];
  const healthPages = ["/espace-client/dossier", "/espace-client/tendances", "/espace-client/analyse", "/espace-client/croissance-enfant", "/espace-client/appels"];

  async function logout() {
    await createClient().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return <div className="min-h-screen bg-slate-100">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/espace-client" className="text-xl font-black text-forest">NutVita<span className="text-orange">Client</span></Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher compact />
          <span className="hidden text-sm text-slate-500 sm:block">{email}</span>
          <button onClick={logout} className="flex gap-2 text-sm font-bold"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button>
        </div>
      </div>
    </header>
    {healthPages.some(item => path.startsWith(item)) && <MedicalDisclaimer />}
    <div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[250px_1fr]">
      <nav className="h-fit rounded-2xl bg-forest p-4 text-white">
        {links.filter(([, , , visible]) => visible).map(([href, label, Icon]) => <Link key={href} href={href} className={`flex gap-3 rounded-xl px-4 py-3 font-bold ${path === href ? "bg-white/15" : "hover:bg-white/10"}`}><Icon className="h-5" />{label}</Link>)}
      </nav>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
