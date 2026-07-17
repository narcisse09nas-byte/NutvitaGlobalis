"use client";

import type {
  EarnedBadge,
} from "@/types/gamification";
import { useLanguage } from "@/hooks/use-language";

export function BadgeCard({
  badge,
}: {
  badge: EarnedBadge;
}) {
  const { locale, text } = useLanguage();
  return (
    <article className="rounded-[24px] border border-green-100 bg-white p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC] text-4xl">
        {badge.icon}
      </div>

      <h3 className="mt-5 text-xl font-extrabold text-[#063D2E]">
        {locale === "fr" ? badge.title : badge.titleEn}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {locale === "fr" ? badge.description : badge.descriptionEn}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
          +{badge.xpReward} XP
        </span>

        <span className="text-xs text-slate-400">
          {text("Débloqué", "Unlocked")}
        </span>
      </div>
    </article>
  );
}
