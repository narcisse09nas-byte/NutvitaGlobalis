"use client";

import Link from "next/link";
import { BookOpenCheck, Clock3, LockKeyhole } from "lucide-react";
import type { AcademyCourse } from "@/types/course";
import { isLessonCompleted, isLessonUnlocked } from "@/lib/course-progress";
import { useProgress } from "@/hooks/use-progress";
import { LessonStatusBadge } from "@/components/courses/LessonStatusBadge";
import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/hooks/use-language";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { loadExerciseSubmissions } from "@/lib/application-exercise-storage";
import { useEffect, useState } from "react";
import type { ExerciseSubmission } from "@/types/application-exercise";

export function CourseModuleList({ course }: { course: AcademyCourse }) {
  const { text } = useLanguage();
  const { data } = useProgress();
  const { user } = useLocalAuth();
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);
  useEffect(() => {
    const refresh = () => setSubmissions(loadExerciseSubmissions());
    refresh();
    window.addEventListener("nutvita-exercises-updated", refresh);
    return () =>
      window.removeEventListener("nutvita-exercises-updated", refresh);
  }, []);
  const exerciseContext = { userId: user?.id, submissions };

  return (
    <div className="space-y-6">
      {course.modules.map((courseModule) => {
        const firstLesson = courseModule.lessons[0];
        const moduleUnlocked = firstLesson
          ? isLessonUnlocked(course, data, courseModule.slug, firstLesson.slug)
          : false;

        return (
          <Card key={courseModule.id}>
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wider text-[#F58220]">
                  Module {courseModule.number}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-[#063D2E]">
                  {courseModule.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {courseModule.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-500">
                <Clock3 size={18} />
                {courseModule.estimatedMinutes} min
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {courseModule.lessons.length === 0 ? (
                <div className="rounded-2xl bg-[#F8FAFC] p-5 text-sm text-slate-500">
                  {text(
                    "Le contenu de ce module sera ajouté prochainement.",
                    "Content for this module will be added soon.",
                  )}
                </div>
              ) : (
                courseModule.lessons.map((lesson, index) => {
                  const unlocked = isLessonUnlocked(
                    course,
                    data,
                    courseModule.slug,
                    lesson.slug,
                    exerciseContext,
                  );
                  const completed = isLessonCompleted(
                    data,
                    course.slug,
                    courseModule.slug,
                    lesson.slug,
                  );
                  const status = completed
                    ? "completed"
                    : unlocked
                      ? "available"
                      : "locked";
                  const content = (
                    <div
                      className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition md:flex-row md:items-center ${unlocked ? "border-green-100 bg-white hover:bg-[#F8FAFC]" : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-70"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDF5E8] font-extrabold text-[#0B5D3B]">
                          {unlocked ? index + 1 : <LockKeyhole size={17} />}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#063D2E]">
                            {lesson.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {lesson.durationMinutes} min · {lesson.type}
                          </p>
                        </div>
                      </div>
                      <LessonStatusBadge status={status} />
                    </div>
                  );
                  return unlocked ? (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/courses/${course.slug}/${courseModule.slug}?lesson=${lesson.slug}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={lesson.id}>{content}</div>
                  );
                })
              )}
            </div>
            {moduleUnlocked && firstLesson && (
              <Link
                href={`/dashboard/courses/${course.slug}/${courseModule.slug}?lesson=${firstLesson.slug}`}
                className="mt-6 inline-flex items-center gap-2 font-bold text-[#0B5D3B] hover:underline"
              >
                <BookOpenCheck size={18} />
                {text("Ouvrir le module", "Open module")}
              </Link>
            )}
          </Card>
        );
      })}
    </div>
  );
}
