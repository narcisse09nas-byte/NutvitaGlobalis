"use client";

import Link from "next/link";

import { Award, Flame, Sparkles, Trophy } from "lucide-react";

import type { DashboardPerformance } from "@/types/student-dashboard";

import { LevelBadge } from "@/components/gamification/LevelBadge";
import { useLanguage } from "@/hooks/use-language";

export function PerformanceOverview({
  performance,
}: {
  performance: DashboardPerformance;
}) {
  const { text } = useLanguage();
  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-[0.14em] text-[#F58220]">
            Performance
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-[#063D2E]">
            {text("Votre progression globale", "Your overall progress")}
          </h2>
        </div>

        <LevelBadge level={performance.level} />
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Sparkles className="text-[#F58220]" />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {performance.totalXp}
          </p>

          <p className="text-xs text-slate-500">
            {text("Points XP", "XP points")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Flame className="text-orange-600" />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {performance.currentStreak}
          </p>

          <p className="text-xs text-slate-500">
            {text("Jours consécutifs", "Consecutive days")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Trophy className="text-[#0B5D3B]" />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {performance.bestExamScore ?? "—"}
            {performance.bestExamScore !== null && "%"}
          </p>

          <p className="text-xs text-slate-500">
            {text("Meilleur examen", "Best exam")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Award className="text-[#0B5D3B]" />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {performance.certificatesCount}
          </p>

          <p className="text-xs text-slate-500">
            {text("Certificats", "Certificates")}
          </p>
        </div>
      </div>

      {performance.recentBadges.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-bold text-[#063D2E]">
            {text("Badges récents", "Recent badges")}
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            {performance.recentBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 rounded-full bg-[#DDF5E8] px-3 py-2 text-sm font-bold text-[#0B5D3B]"
              >
                <span>{badge.icon}</span>

                {badge.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/rewards"
        className="mt-7 inline-flex font-bold text-[#0B5D3B] hover:underline"
      >
        {text("Voir toutes mes récompenses", "View all my rewards")}
      </Link>
    </section>
  );
}
