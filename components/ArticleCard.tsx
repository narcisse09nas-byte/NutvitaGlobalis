"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Article } from "@/data/content";
import { localizedPath, normalizeLocale, stripLocale } from "@/lib/i18n";

const fallbackImage = "/images/hero-nutvita.png";

export default function ArticleCard({ article }: { article: Article }) {
  const locale = normalizeLocale(stripLocale(usePathname()).locale);
  const english = locale === "en";
  const image = article.image || fallbackImage;
  return <article className="card group flex h-full flex-col">
    <div className="relative h-52 overflow-hidden bg-mint"><img src={image} alt={article.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-3 flex items-center justify-between text-xs font-bold text-leaf"><span>{article.category}</span><span className="text-slate-400">{article.readTime}</span></div>
      <h3 className="mb-3 text-xl font-bold">{article.title}</h3>
      <p className="mb-5 text-sm leading-6 text-slate-500">{article.excerpt}</p>
      <Link className="mt-auto font-bold text-orange" href={localizedPath(locale, `/ressources/${article.slug}`)}>{english ? "Read article" : "Lire l'article"} <span aria-hidden>→</span></Link>
    </div>
  </article>;
}