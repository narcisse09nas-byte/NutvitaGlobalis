"use client";

import {
  CalendarDays,
  Flame,
} from "lucide-react";

import { useGamification } from "@/hooks/use-gamification";
import { useLanguage } from "@/hooks/use-language";

export function StreakCard() {
  const { locale, text } = useLanguage();
  const { profile } =
    useGamification();

  return (
    <section className="rounded-[28px] border border-orange-100 bg-white p-7">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
        <Flame size={29} />
      </div>

      <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
        {text("Série quotidienne", "Daily streak")}
      </h2>

      <p className="mt-4 text-5xl font-extrabold text-[#F58220]">
        {profile.currentStreak}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {locale === "fr"
          ? `jour${profile.currentStreak > 1 ? "s" : ""} consécutif${profile.currentStreak > 1 ? "s" : ""}`
          : `day${profile.currentStreak > 1 ? "s" : ""} in a row`}
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-4">
        <CalendarDays className="text-[#0B5D3B]" />

        <div>
          <p className="text-sm font-bold text-[#063D2E]">
            {text("Meilleure série", "Best streak")}
          </p>

          <p className="text-sm text-slate-500">
            {profile.longestStreak} {text("jour", "day")}
            {profile.longestStreak > 1
              ? "s"
              : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
