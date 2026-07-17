"use client";

import {
  Sparkles,
  Trophy,
} from "lucide-react";

import { useGamification } from "@/hooks/use-gamification";

import { LevelBadge } from "@/components/gamification/LevelBadge";

export function XpProgressCard() {
  const { profile } =
    useGamification();

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
            <Trophy size={28} />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
            Votre niveau
          </h2>
        </div>

        <LevelBadge
          level={profile.level}
        />
      </div>

      <div className="mt-7 flex items-end gap-3">
        <p className="text-5xl font-extrabold text-[#063D2E]">
          {profile.totalXp}
        </p>

        <p className="pb-1 font-bold text-[#F58220]">
          XP
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-600">
            Progression du niveau
          </span>

          <span className="font-extrabold text-[#0B5D3B]">
            {
              profile.progressToNextLevel
            }
            %
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-green-100">
          <div
            className="h-full rounded-full bg-[#0B5D3B] transition-all"
            style={{
              width: `${profile.progressToNextLevel}%`,
            }}
          />
        </div>

        <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
          <Sparkles size={16} />

          {profile.nextLevelMinimumXp ===
          null
            ? "Vous avez atteint le niveau maximal."
            : `${
                profile.nextLevelMinimumXp -
                profile.totalXp
              } XP avant le prochain niveau.`}
        </p>
      </div>
    </section>
  );
}