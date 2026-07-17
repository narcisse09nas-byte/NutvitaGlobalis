"use client";

import Link from "next/link";

import { ArrowRight, BookOpenCheck, Clock3 } from "lucide-react";

import type { DashboardCurrentLearning } from "@/types/student-dashboard";
import { useLanguage } from "@/hooks/use-language";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}`;
}

export function CurrentLearningCard({
  learning,
}: {
  learning: DashboardCurrentLearning | null;
}) {
  const { text } = useLanguage();
  if (!learning) {
    return (
      <section className="rounded-[28px] border border-dashed border-green-200 bg-white p-8 text-center">
        <BookOpenCheck size={44} className="mx-auto text-[#0B5D3B]" />

        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {text(
            "Commencez votre première formation",
            "Start your first course",
          )}
        </h2>

        <Link
          href="/dashboard/courses"
          className="mt-6 inline-flex rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          {text("Découvrir les formations", "Explore courses")}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7">
      <p className="font-bold uppercase tracking-[0.14em] text-[#F58220]">
        {text("Formation en cours", "Current course")}
      </p>

      <h2 className="mt-3 text-2xl font-extrabold leading-8 text-[#063D2E]">
        {learning.courseTitle}
      </h2>

      <p className="mt-2 text-sm text-slate-500">{learning.courseTitleFr}</p>

      {learning.moduleTitle && (
        <div className="mt-6 rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#0B5D3B]">
            {text("Prochaine activité", "Next activity")}
          </p>

          <p className="mt-2 font-extrabold text-[#063D2E]">
            {learning.moduleTitle}
          </p>

          {learning.lessonTitle && (
            <p className="mt-1 text-sm text-slate-600">
              {learning.lessonTitle}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-600">
            {text("Progression", "Progress")}
          </span>

          <span className="font-extrabold text-[#0B5D3B]">
            {learning.progressPercent}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-green-100">
          <div
            className="h-full rounded-full bg-[#0B5D3B]"
            style={{
              width: `${learning.progressPercent}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <BookOpenCheck size={17} />
          {learning.completedLessons}/{learning.totalLessons}{" "}
          {text("leçons", "lessons")}
        </span>

        <span className="inline-flex items-center gap-2">
          <Clock3 size={17} />

          {formatTime(learning.timeSpentSeconds)}
        </span>
      </div>

      <Link
        href={learning.href}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white transition hover:bg-orange-600"
      >
        {text("Reprendre la formation", "Resume course")}
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
