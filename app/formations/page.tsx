import Image from "next/image";
import Link from "next/link";
import { ClockIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { getFormations } from "@/lib/public-content";
import { getSitePage } from "@/lib/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";

export const metadata = { title: "Formations certifiantes" }; export const revalidate = 60;
export default async function Formations() {
  const [formations, page, locale] = await Promise.all([getFormations(), getSitePage("formations"), getCurrentLocale()]); const english = locale === "en";
  return <>{page && <><ManagedPageHero initial={page} /><ManagedPageSections initial={page} /></>}<section className="section"><div className="container-site grid gap-7 md:grid-cols-2">{formations.map((formation: any) => <article className="card group" key={formation.title}><div className="relative h-64"><Image src={formation.image} alt={formation.title} fill className="object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-bold text-leaf">{english ? "Certificate included" : "Certificat inclus"}</span></div><div className="p-7"><h2 className="text-2xl font-black">{formation.title}</h2>{formation.shortDescription && <p className="mt-3 text-sm leading-6 text-slate-500">{formation.shortDescription}</p>}<div className="my-5 flex flex-wrap gap-5 text-sm text-slate-500"><span className="flex items-center gap-2"><ClockIcon className="h-5 text-orange" />{formation.duration}</span><span className="flex items-center gap-2"><ChartBarIcon className="h-5 text-orange" />{formation.level}</span></div><div className="flex items-center justify-between gap-4 border-t pt-5"><p className="text-sm font-bold text-forest">{english ? "Temporary free access" : "Acces gratuit temporaire"}</p><Link href={formation.id ? `/checkout?type=formation&id=${formation.id}` : localizedPath(locale, "/connexion")} className="btn-primary">{english ? "Activate free access" : "Activer gratuitement"}</Link></div></div></article>)}</div></section></>;
}