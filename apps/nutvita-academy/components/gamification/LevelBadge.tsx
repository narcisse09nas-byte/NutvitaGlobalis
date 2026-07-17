import {
  Crown,
} from "lucide-react";

import type {
  GamificationLevel,
} from "@/types/gamification";

const levelLabels: Record<
  GamificationLevel,
  string
> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

const levelStyles: Record<
  GamificationLevel,
  string
> = {
  bronze:
    "bg-orange-100 text-orange-800",
  silver:
    "bg-slate-200 text-slate-700",
  gold:
    "bg-yellow-100 text-yellow-800",
  platinum:
    "bg-cyan-100 text-cyan-800",
  diamond:
    "bg-purple-100 text-purple-800",
};

export function LevelBadge({
  level,
}: {
  level: GamificationLevel;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${levelStyles[level]}`}
    >
      <Crown size={17} />

      Niveau{" "}
      {levelLabels[level]}
    </span>
  );
}