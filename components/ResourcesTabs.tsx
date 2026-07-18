"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LockClosedIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import ArticleCard from "@/components/ArticleCard";
import type { Article } from "@/data/content";
import { normalizeLocale, stripLocale } from "@/lib/i18n";

const fallbackPremium = {
  fr: ["Guide pratique de prise en charge de la malnutrition", "Menus equilibres sur 30 jours", "Fiches de suivi nutritionnel professionnel", "Manuel de securite sanitaire des aliments"],
  en: ["Practical guide to malnutrition management", "30-day balanced meal plans", "Professional nutrition monitoring sheets", "Food safety handbook"],
};

export default function ResourcesTabs({ articles, premiumResources }: { articles: Article[]; premiumResources?: Array<Record<string, unknown>> | null }) {
  const locale = normalizeLocale(stripLocale(usePathname()).locale);
  const english = locale === "en";
  const [tab, setTab] = useState<"free" | "premium">("free");
  const premium = premiumResources?.length
    ? premiumResources.map(item => ({ title: String(item.title), description: String(item.description || ""), url: String(item.file_url || "#") }))
    : fallbackPremium[locale].map(title => ({ title, description: english ? "A complete, ready-to-use resource updated regularly." : "Un outil complet, pret a utiliser et regulierement actualise.", url: "#" }));
  return <>
    <div className="mb-10 flex justify-center"><div className="rounded-full bg-mint p-1" role="tablist" aria-label={english ? "Resource categories" : "Categories de ressources"}>
      <button role="tab" aria-selected={tab === "free"} onClick={() => setTab("free")} className={`rounded-full px-6 py-3 text-sm font-bold ${tab === "free" ? "bg-forest text-white" : "text-forest"}`}>{english ? "Free articles" : "Articles gratuits"}</button>
      <button role="tab" aria-selected={tab === "premium"} onClick={() => setTab("premium")} className={`rounded-full px-6 py-3 text-sm font-bold ${tab === "premium" ? "bg-forest text-white" : "text-forest"}`}>{english ? "Premium resources" : "Ressources premium"}</button>
    </div></div>
    {tab === "free" ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{articles.map(article => <ArticleCard key={article.slug} article={article} />)}</div> : <div className="grid gap-6 md:grid-cols-2">{premium.map((item, index) => <article key={item.title} className="card flex items-start gap-5 p-7"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mint text-leaf">{index % 2 ? <DocumentArrowDownIcon className="h-7" /> : <LockClosedIcon className="h-7" />}</span><div><p className="text-xs font-bold uppercase tracking-widest text-orange">{english ? "Premium resource" : "Ressource premium"}</p><h2 className="mt-2 text-xl font-black">{item.title}</h2><p className="my-3 text-sm leading-6">{item.description}</p><a href={item.url} className="font-bold text-leaf">{english ? "Access" : "Acceder"} <span aria-hidden>→</span></a></div></article>)}</div>}
  </>;
}