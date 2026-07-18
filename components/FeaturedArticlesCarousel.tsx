"use client";

import { useRef } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import ArticleCard from "@/components/ArticleCard";
import type { Article } from "@/data/content";

export default function FeaturedArticlesCarousel({ articles, locale }: { articles: Article[]; locale: "fr" | "en" }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: -1 | 1) => rail.current?.scrollBy({ left: direction * Math.min(rail.current.clientWidth * 0.85, 430), behavior: "smooth" });
  return <div>
    <div className="mb-6 flex justify-end gap-2">
      <button type="button" onClick={() => move(-1)} aria-label={locale === "en" ? "Previous articles" : "Articles precedents"} className="grid h-11 w-11 place-items-center rounded-full border border-forest/15 bg-white text-forest transition hover:border-leaf hover:text-leaf"><ArrowLeftIcon className="h-5" /></button>
      <button type="button" onClick={() => move(1)} aria-label={locale === "en" ? "Next articles" : "Articles suivants"} className="grid h-11 w-11 place-items-center rounded-full bg-forest text-white transition hover:bg-leaf"><ArrowRightIcon className="h-5" /></button>
    </div>
    <div ref={rail} className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-5 [scrollbar-width:thin] [scrollbar-color:#24945f_#e8f4ed]">
      {articles.map(article => <div key={article.slug} className="w-[86vw] max-w-[380px] shrink-0 snap-start sm:w-[360px] lg:w-[380px]"><ArticleCard article={article} /></div>)}
    </div>
  </div>;
}
