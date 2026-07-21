"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, BookOpen, Clock3 } from "lucide-react";

import type { AcademyCourse, CourseModule } from "@/types/course";

import { useProgress } from "@/hooks/use-progress";

import { LessonProgressButton } from "@/components/progress/LessonProgressButton";
import { LessonStatusBadge } from "@/components/courses/LessonStatusBadge";
import { LessonVideoSection } from "@/components/player/LessonVideoSection";
import { FavoriteLessonButton } from "@/components/favorites/FavoriteLessonButton";
import { LessonNotesPanel } from "@/components/notes/LessonNotesPanel";
import { LearningHistoryTracker } from "@/components/history/LearningHistoryTracker";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";
import { LocalMediaLink } from "@/components/player/LocalMediaLink";
import { InteractiveHtmlLesson } from "@/components/player/InteractiveHtmlLesson";
import { isLessonCompleted, isLessonUnlocked } from "@/lib/course-progress";
import { useLanguage } from "@/hooks/use-language";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { loadExerciseSubmissions } from "@/lib/application-exercise-storage";
import type { ExerciseSubmission } from "@/types/application-exercise";

type ModuleLearningWorkspaceProps = {
  course: AcademyCourse;
  module: CourseModule;
  selectedLessonSlug?: string;
};

export function ModuleLearningWorkspace({
  course,
  module,
  selectedLessonSlug,
}: ModuleLearningWorkspaceProps) {
  const { data, registerLessonVisit, updateLessonProgress, getLessonProgress } =
    useProgress();
  const { text } = useLanguage();
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

  const availableLessons = module.lessons.filter((lesson) =>
    isLessonUnlocked(course, data, module.slug, lesson.slug, exerciseContext),
  );

  const selectedLesson =
    availableLessons.find((lesson) => lesson.slug === selectedLessonSlug) ??
    availableLessons[0];

  const currentProgress = selectedLesson
    ? getLessonProgress(course.slug, module.slug, selectedLesson.slug)
    : null;

  const lessonReference = selectedLesson
    ? {
        courseSlug: course.slug,
        moduleSlug: module.slug,
        lessonSlug: selectedLesson.slug,
        lessonTitle: selectedLesson.title,
        moduleTitle: module.title,
        courseTitle: course.title,
      }
    : null;

  useEffect(() => {
    if (!selectedLesson) {
      return;
    }

    registerLessonVisit({
      lessonId: selectedLesson.id,
      courseSlug: course.slug,
      moduleSlug: module.slug,
      lessonSlug: selectedLesson.slug,
    });
  }, [selectedLesson, course.slug, module.slug, registerLessonVisit]);

  useEffect(() => {
    if (!selectedLesson || selectedLesson.type === "video") {
      return;
    }

    const interval = window.setInterval(() => {
      updateLessonProgress({
        lessonId: selectedLesson.id,
        courseSlug: course.slug,
        moduleSlug: module.slug,
        lessonSlug: selectedLesson.slug,
        additionalTimeSeconds: 20,
      });
    }, 20000);

    return () => {
      window.clearInterval(interval);
    };
  }, [selectedLesson, course.slug, module.slug, updateLessonProgress]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {lessonReference && (
        <LearningHistoryTracker
          reference={lessonReference}
          videoTimeSeconds={currentProgress?.lastPositionSeconds}
        />
      )}

      <Link
        href={`/dashboard/courses/${course.slug}`}
        className="inline-flex items-center gap-2 font-bold text-[#0B5D3B] hover:underline"
      >
        <ArrowLeft size={18} />
        Retour au programme
      </Link>

      <div className="mt-7 grid min-w-0 gap-8 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <Card className="sticky top-24">
            <p className="text-sm font-extrabold uppercase tracking-wider text-[#F58220]">
              Module {module.number}
            </p>

            <h1 className="mt-3 text-2xl font-extrabold text-[#063D2E]">
              {module.title}
            </h1>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Clock3 size={17} />
              {module.estimatedMinutes} minutes
            </div>

            <div className="mt-6 space-y-3">
              {module.lessons.map((lesson, index) => {
                const completed = isLessonCompleted(
                  data,
                  course.slug,
                  module.slug,
                  lesson.slug,
                );

                const isLocked = !isLessonUnlocked(
                  course,
                  data,
                  module.slug,
                  lesson.slug,
                  exerciseContext,
                );

                const isActive = selectedLesson?.slug === lesson.slug;

                const dynamicStatus = completed
                  ? "completed"
                  : isLocked
                    ? "locked"
                    : "available";

                if (isLocked) {
                  return (
                    <div
                      key={lesson.id}
                      className="rounded-2xl bg-slate-50 p-4 opacity-60"
                    >
                      <p className="text-sm font-bold text-slate-500">
                        {index + 1}. {lesson.title}
                      </p>

                      <div className="mt-2">
                        <LessonStatusBadge status={dynamicStatus} />
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/courses/${course.slug}/${module.slug}?lesson=${lesson.slug}`}
                    className={`block rounded-2xl p-4 transition ${
                      isActive
                        ? "bg-[#DDF5E8] ring-1 ring-[#0B5D3B]"
                        : "bg-[#F8FAFC] hover:bg-green-50"
                    }`}
                  >
                    <p className="text-sm font-extrabold text-[#063D2E]">
                      {index + 1}. {lesson.title}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        {lesson.durationMinutes} min
                      </span>

                      <LessonStatusBadge status={dynamicStatus} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </aside>

        <section className="min-w-0 space-y-6">
          {selectedLesson ? (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wider text-[#F58220]">
                      {selectedLesson.type}
                    </p>

                    <h2 className="mt-2 text-3xl font-extrabold text-[#063D2E]">
                      {selectedLesson.title}
                    </h2>
                  </div>

                  <LessonStatusBadge
                    status={
                      currentProgress?.status === "completed"
                        ? "completed"
                        : selectedLesson.status
                    }
                  />
                </div>

                <ProgressBar
                  value={currentProgress?.progressPercent ?? 0}
                  label={text("Progression de la leçon", "Lesson progress")}
                  className="mt-7"
                />

                {lessonReference && (
                  <div className="mt-5">
                    <FavoriteLessonButton reference={lessonReference} />
                  </div>
                )}

                <div className="mt-8">
                  {selectedLesson.type === "video" ? (
                    <LessonVideoSection
                      course={course}
                      module={module}
                      lesson={selectedLesson}
                    />
                  ) : selectedLesson.type === "interactive-html" &&
                    selectedLesson.htmlUrl ? (
                    <InteractiveHtmlLesson
                      key={selectedLesson.id}
                      htmlUrl={selectedLesson.htmlUrl}
                      lessonId={selectedLesson.id}
                      courseSlug={course.slug}
                      moduleSlug={module.slug}
                      lessonSlug={selectedLesson.slug}
                    />
                  ) : selectedLesson.type === "quiz" &&
                    selectedLesson.quizSlug ? (
                    <div className="rounded-[24px] bg-[#F8FAFC] p-8 text-center">
                      <BookOpen size={42} className="mx-auto text-[#0B5D3B]" />
                      <h3 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
                        {text("Quiz du module", "Module quiz")}
                      </h3>
                      <p className="mt-3 text-slate-600">
                        {text(
                          "Le quiz est maintenant déverrouillé. Sa réussite validera cette étape.",
                          "The quiz is now unlocked. Passing it will validate this step.",
                        )}
                      </p>
                      <Link
                        href={`/dashboard/assessments/${selectedLesson.quizSlug}`}
                        className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
                      >
                        {text("Commencer le quiz", "Start quiz")}
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-[24px] bg-[#F8FAFC] p-8">
                      <BookOpen size={42} className="text-[#0B5D3B]" />

                      <h3 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
                        Contenu de lecture
                      </h3>

                      <p className="mt-4 leading-7 text-slate-600">
                        {selectedLesson.description}
                      </p>

                      {selectedLesson.resourceUrl && (
                        <LocalMediaLink
                          href={selectedLesson.resourceUrl}
                          className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white"
                        >
                          Ouvrir la ressource
                        </LocalMediaLink>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 rounded-2xl bg-[#F8FAFC] p-6">
                  <h3 className="text-xl font-extrabold text-[#063D2E]">
                    {text("À propos de cette leçon", "About this lesson")}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {selectedLesson.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Clock3 size={17} />
                    {text("Durée estimée", "Estimated duration")}:{" "}
                    {selectedLesson.durationMinutes} minutes
                  </div>
                </div>

                {selectedLesson.type !== "video" &&
                  selectedLesson.type !== "interactive-html" &&
                  selectedLesson.type !== "quiz" && (
                    <div className="mt-7 flex justify-end">
                      <LessonProgressButton
                        lessonId={selectedLesson.id}
                        courseSlug={course.slug}
                        moduleSlug={module.slug}
                        lessonSlug={selectedLesson.slug}
                      />
                    </div>
                  )}
              </Card>

              {lessonReference && (
                <LessonNotesPanel
                  reference={lessonReference}
                  currentVideoTime={currentProgress?.lastPositionSeconds}
                />
              )}
            </>
          ) : (
            <Card className="text-center">
              <h2 className="text-2xl font-extrabold text-[#063D2E]">
                {text("Aucune leçon disponible", "No lesson available")}
              </h2>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
