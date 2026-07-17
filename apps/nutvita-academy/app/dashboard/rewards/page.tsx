"use client";

import { Award } from "lucide-react";

import { useGamification } from "@/hooks/use-gamification";

import { BadgeCard } from "@/components/gamification/BadgeCard";
import { GamificationSummary } from "@/components/gamification/GamificationSummary";
import { StreakCard } from "@/components/gamification/StreakCard";
import { XpProgressCard } from "@/components/gamification/XpProgressCard";
import { useLanguage } from "@/hooks/use-language";

export default function RewardsPage() {
  const { locale, text } = useLanguage();
  const { profile } = useGamification();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Motivation", "Motivation")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("XP, niveaux et récompenses", "XP, levels and rewards")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Progressez dans vos formations, accumulez des points XP et débloquez des badges.",
            "Progress through your courses, earn XP and unlock badges.",
          )}
        </p>
      </header>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <XpProgressCard />
        <StreakCard />
      </div>

      <div className="mt-8">
        <GamificationSummary />
      </div>

      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Badges débloqués", "Unlocked badges")}
        </h2>

        <p className="mt-2 text-slate-600">
          {profile.earnedBadges.length}{" "}
          {locale === "fr"
            ? `récompense${profile.earnedBadges.length > 1 ? "s" : ""} obtenue${profile.earnedBadges.length > 1 ? "s" : ""}.`
            : `reward${profile.earnedBadges.length === 1 ? "" : "s"} earned.`}
        </p>

        {profile.earnedBadges.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
            <Award size={44} className="mx-auto text-[#0B5D3B]" />

            <h3 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
              {text("Aucun badge débloqué", "No badge unlocked")}
            </h3>

            <p className="mt-2 text-slate-500">
              {text(
                "Terminez votre première leçon pour obtenir votre premier badge.",
                "Complete your first lesson to earn your first badge.",
              )}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {profile.earnedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
