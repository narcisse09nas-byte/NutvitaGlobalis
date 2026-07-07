"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBarIcon, CheckBadgeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { normalizeLocale, stripLocale } from "@/lib/i18n";

export default function ChildGrowthPromo() {
  const english = normalizeLocale(stripLocale(usePathname()).locale) === "en";
  const benefits = english ? [[ChartBarIcon, "Growth charts"], [CheckBadgeIcon, "Careful analyses and guidance"], [UserGroupIcon, "Individual monitoring for each child"]] : [[ChartBarIcon, "Courbes de croissance"], [CheckBadgeIcon, "Analyses et conseils prudents"], [UserGroupIcon, "Un suivi par enfant"]];
  return <section className="section bg-mint/50"><div className="container-site grid items-center gap-8 bg-white p-8 shadow-soft lg:grid-cols-2 lg:p-14"><div><span className="eyebrow"><UserGroupIcon className="mr-2 h-4"/>{english ? "New service" : "Nouveau service"}</span><h2 className="text-4xl font-black">{english ? "Child Growth Promotion Monitoring" : "Suivi Promotion Croissance Enfant"}</h2><p className="mt-4 leading-7 text-slate-600">{english ? "Monitor each child’s indicators with clear charts and practical guidance." : "Suivez les indicateurs de chaque enfant avec courbes et conseils."}</p><p className="mt-5 text-2xl font-black text-forest">{english ? "Temporary free access" : "Accès gratuit temporaire"}</p><Link href="/espace-client/croissance-enfant" className="btn-primary mt-6">{english ? "Add a child" : "Ajouter un enfant"}</Link></div><div className="grid gap-3">{benefits.map(([Icon, label]) => <div key={String(label)} className="flex items-center gap-3 bg-mint p-5 font-bold text-forest"><Icon className="h-6 text-leaf"/>{String(label)}</div>)}</div></div></section>;
}
