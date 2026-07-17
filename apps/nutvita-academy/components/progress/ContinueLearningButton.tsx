"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AcademyCourse } from "@/types/course";

import { useProgress } from "@/hooks/use-progress";
import { getNextLearningEntry, isCourseCompleted } from "@/lib/course-progress";

type ContinueLearningButtonProps = {
  course: AcademyCourse;
  className?: string;
};

export function ContinueLearningButton({
  course,
  className = "",
}: ContinueLearningButtonProps) {
  const { data, getExamProgress } = useProgress();

  const next = getNextLearningEntry(course, data);
  const completed = isCourseCompleted(course, data);
  const exam = getExamProgress(course.slug);
  const href = exam?.passed ? "/certificates/camms" : completed
    ? "/learn/camms/final-exam"
    : next ? `/dashboard/courses/${course.slug}/${next.module.slug}?lesson=${next.lesson.slug}` : `/dashboard/courses/${course.slug}`;
  const label = exam?.passed ? "Voir mon certificat" : completed ? "Passer l’examen final" : data.lastPositions[course.slug] ? "Reprendre la formation" : "Commencer la formation";

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#F58220] px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600 ${className}`}
    >
      {label}

      <ArrowRight size={18} />
    </Link>
  );
}
