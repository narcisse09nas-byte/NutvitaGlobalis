"use client";

import {
  Award,
  BookOpenCheck,
  ClipboardCheck,
  FileCheck2,
} from "lucide-react";

import { useGamification } from "@/hooks/use-gamification";
import { useLanguage } from "@/hooks/use-language";

export function GamificationSummary() {
  const { text } = useLanguage();
  const { profile } =
    useGamification();

  const statistics = [
    {
      label:
        text("Leçons terminées", "Lessons completed"),
      value:
        profile.completedLessons,
      icon: BookOpenCheck,
    },
    {
      label:
        text("Quiz réussis", "Quizzes passed"),
      value:
        profile.passedQuizzes,
      icon: ClipboardCheck,
    },
    {
      label:
        text("Examens réussis", "Exams passed"),
      value:
        profile.passedExams,
      icon: FileCheck2,
    },
    {
      label:
        "Certificats",
      value:
        profile.certificatesCount,
      icon: Award,
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {statistics.map(
        (statistic) => {
          const Icon =
            statistic.icon;

          return (
            <article
              key={
                statistic.label
              }
              className="rounded-[24px] border border-green-100 bg-white p-6"
            >
              <Icon className="text-[#0B5D3B]" />

              <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">
                {statistic.value}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {statistic.label}
              </p>
            </article>
          );
        }
      )}
    </div>
  );
}
