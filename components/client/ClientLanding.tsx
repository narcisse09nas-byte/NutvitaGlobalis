"use client";

import Link from "next/link";
import {
  AcademicCapIcon, ArrowRightIcon, ChartBarSquareIcon, ChatBubbleLeftRightIcon,
  CreditCardIcon, HeartIcon, KeyIcon, ShoppingBagIcon, UserCircleIcon, ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

type Service = {
  key: string;
  role: string;
  title: string;
  description: string;
  href: string;
  active: boolean;
  icon: typeof HeartIcon;
};

export default function ClientLanding({
  name,
  access,
  academyActive,
  activeServices,
}: {
  name: string;
  access: { health: boolean; childGrowth: boolean; teleconsultation: boolean };
  academyActive: boolean;
  activeServices: string[];
}) {
  const services: Service[] = [
    { key: "academy", role: "student", title: "NutVitaGlobalis Academy", description: "Formations, évaluations, progression et certificats.", href: "/api/academy/sso?role=student", active: academyActive, icon: AcademicCapIcon },
    { key: "health", role: "client", title: "Suivi santé personnalisé", description: "Paramètres, questionnaires, tendances, analyses et rapports.", href: "/espace-client/dossier", active: access.health, icon: HeartIcon },
    { key: "child_growth", role: "client", title: "Croissance de l’enfant", description: "Mesures, courbes et analyse du développement.", href: "/espace-client/croissance-enfant", active: access.childGrowth, icon: ChartBarSquareIcon },
    { key: "teleconsultation", role: "client", title: "Consultations diététiques/nutritionnelles, en présentiel ou en ligne", description: "Consultations, messagerie et appels vidéo.", href: "/espace-client/consultations", active: access.teleconsultation, icon: ChatBubbleLeftRightIcon },
    { key: "nutritrack", role: "client", title: "Prise en charge de la malnutrition aigue", description: "Application NutriTrack pour les equipes et structures autorisees.", href: "/nutritrack", active: activeServices.includes("nutritrack"), icon: HeartIcon },
    { key: "survey", role: "client", title: "Enquetes de securite alimentaire et nutrition", description: "Questionnaires, collecte, analyse et rapports d enquete.", href: "/surveys", active: activeServices.includes("survey"), icon: ChartBarSquareIcon },
    { key: "project_management", role: "client", title: "Gestion de projets, programmes et portefeuilles", description: "Planification, suivi des activites, ressources et resultats.", href: "/op-management", active: activeServices.includes("project_management"), icon: ClipboardDocumentListIcon },
  ];

  async function open(service: Service) {
    if (!service.active) {
      window.location.assign(`/espace-client/services?activer=${service.key}`);
      return;
    }
    const response = await fetch("/api/access/select", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: service.key, role: service.role }),
    });
    const result = await response.json();
    window.location.assign(response.ok ? result.href : service.href);
  }

  return <div className="grid gap-8">
    <section className="overflow-hidden rounded-[2rem] bg-forest text-white shadow-soft">
      <div className="grid gap-8 p-7 md:grid-cols-[1.3fr_.7fr] md:p-10">
        <div><p className="text-xs font-black uppercase tracking-[.22em] text-orange">Mon espace NutVitaGlobalis</p><h1 className="mt-4 text-4xl font-black text-white">Bonjour {name}</h1><p className="mt-3 max-w-2xl leading-7 text-white/75">Choisissez l’espace que vous souhaitez ouvrir. Chaque service possède sa propre interface et n’affiche que ses fonctions.</p></div>
        <div className="rounded-3xl bg-white/10 p-6"><p className="text-sm text-white/70">Besoin d’un nouveau service ?</p><Link href="/espace-client/services" className="mt-3 inline-flex items-center gap-2 font-black text-white">Découvrir les solutions <ArrowRightIcon className="h-4"/></Link></div>
      </div>
    </section>

    <section>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Choisir un service</h2><p className="mt-1 text-sm text-slate-500">Les services non actifs vous conduisent d’abord vers leur activation.</p></div></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {services.map(service => <button key={service.key} type="button" onClick={() => open(service)} className="group rounded-3xl border bg-white p-6 text-left shadow-soft transition hover:-translate-y-1 hover:border-leaf">
          <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-forest"><service.icon className="h-6"/></span><span className={`rounded-full px-3 py-1 text-xs font-black ${service.active ? "bg-emerald-100 text-emerald-800" : "bg-orange/10 text-orange"}`}>{service.active ? "Actif" : "À activer"}</span></div>
          <h3 className="mt-5 text-xl font-black text-forest">{service.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{service.description}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-leaf">{service.active ? "Ouvrir cet espace" : "Voir les offres"} <ArrowRightIcon className="h-4 transition group-hover:translate-x-1"/></span>
        </button>)}
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Utility href="/espace-client/services" label="Acheter un service" icon={ShoppingBagIcon}/>
      <Utility href="/espace-client/abonnement" label="Mes abonnements" icon={CreditCardIcon}/>
      <Utility href="/espace-client/profil" label="Mon profil" icon={UserCircleIcon}/>
      <Utility href="/espace-client/securite" label="Mot de passe" icon={KeyIcon}/>
    </section>
  </div>;
}

function Utility({ href, label, icon: Icon }: { href: string; label: string; icon: typeof HeartIcon }) {
  return <Link href={href} className="flex items-center gap-3 rounded-2xl border bg-white p-5 font-black text-forest transition hover:border-leaf hover:bg-mint"><Icon className="h-6"/>{label}</Link>;
}
