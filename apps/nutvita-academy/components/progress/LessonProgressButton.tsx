"use client";

import {
  CheckCircle2,
  CircleCheckBig,
} from "lucide-react";

import { useProgress } from "@/hooks/use-progress";
import { useLanguage } from "@/hooks/use-language";

type LessonProgressButtonProps = {
  lessonId: string;
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
};

export function LessonProgressButton({
  lessonId,
  courseSlug,
  moduleSlug,
  lessonSlug,
}: LessonProgressButtonProps) {
  const {
    completeLesson,
    getLessonProgress,
  } = useProgress();
  const { text } = useLanguage();

  const progress = getLessonProgress(
    courseSlug,
    moduleSlug,
    lessonSlug
  );

  const completed =
    progress?.status === "completed";

  function handleComplete() {
    completeLesson({
      lessonId,
      courseSlug,
      moduleSlug,
      lessonSlug,
    });
  }

  if (completed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-5 py-3 text-sm font-bold text-green-700">
        <CheckCircle2 size={19} />
        {text("Leçon terminée", "Lesson completed")}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleComplete}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F58220] px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
    >
      <CircleCheckBig size={19} />
      {text("Marquer comme terminée", "Mark as completed")}
    </button>
  );
}
