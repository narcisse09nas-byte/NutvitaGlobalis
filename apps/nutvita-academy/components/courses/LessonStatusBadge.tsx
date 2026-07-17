"use client";

import { CheckCircle2, CirclePlay, Lock } from "lucide-react";

import type { LessonStatus } from "@/types/course";
import { useLanguage } from "@/hooks/use-language";

type LessonStatusBadgeProps = {
  status: LessonStatus;
};

const labels: Record<LessonStatus, { fr: string; en: string }> = {
  available: { fr: "Disponible", en: "Available" },
  completed: { fr: "Terminé", en: "Completed" },
  locked: { fr: "Verrouillé", en: "Locked" },
};

export function LessonStatusBadge({ status }: LessonStatusBadgeProps) {
  const { locale } = useLanguage();
  const icon =
    status === "completed" ? (
      <CheckCircle2 size={15} />
    ) : status === "locked" ? (
      <Lock size={15} />
    ) : (
      <CirclePlay size={15} />
    );

  const styles =
    status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "locked"
        ? "bg-slate-100 text-slate-500"
        : "bg-orange-100 text-orange-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {icon}
      {labels[status][locale]}
    </span>
  );
}
