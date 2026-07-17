"use client";

import {
  BookCheck,
  Clock3,
  PlayCircle,
} from "lucide-react";

import type { AcademyCourse } from "@/types/course";

import { useProgress } from "@/hooks/use-progress";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useLanguage } from "@/hooks/use-language";

type CourseProgressSummaryProps = {
  course: AcademyCourse;
};

function formatDuration(
  totalSeconds: number
): string {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes
    .toString()
    .padStart(2, "0")} min`;
}

export function CourseProgressSummary({
  course,
}: CourseProgressSummaryProps) {
  const { getCourseSummary } =
    useProgress();
  const { text } = useLanguage();

  const lessonIds =
    course.modules.flatMap(
      (module) =>
        module.lessons.filter((lesson) => lesson.type !== "resource").map(
          (lesson) => lesson.id
        )
    );

  const summary = getCourseSummary(
    course.slug,
    lessonIds
  );

  return (
    <Card>
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        Votre progression
      </h2>

      <ProgressBar
        value={summary.progressPercent}
        label="Certification CAMMS"
        className="mt-6"
      />

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <BookCheck
            size={25}
            className="text-[#0B5D3B]"
          />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {summary.completedLessons}/
            {summary.totalLessons}
          </p>

          <p className="text-sm text-slate-500">
            {text("Leçons terminées", "Lessons completed")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <PlayCircle
            size={25}
            className="text-[#F58220]"
          />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {summary.startedLessons}
          </p>

          <p className="text-sm text-slate-500">
            {text("Leçons en cours", "Lessons in progress")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Clock3
            size={25}
            className="text-[#0B5D3B]"
          />

          <p className="mt-3 text-2xl font-extrabold text-[#063D2E]">
            {formatDuration(
              summary.totalTimeSeconds
            )}
          </p>

          <p className="text-sm text-slate-500">
            Temps d’apprentissage
          </p>
        </div>
      </div>
    </Card>
  );
}
