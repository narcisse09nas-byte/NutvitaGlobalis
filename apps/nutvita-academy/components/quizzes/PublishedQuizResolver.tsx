"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, ListChecks, RotateCcw, Trophy } from "lucide-react";
import { getQuizBySlug } from "@/data/quiz-bank";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import {
  getPublishedStudioCourses,
  localizeStudioQuiz,
} from "@/lib/studio-course-runtime";
import { QuizRunner } from "@/components/quizzes/QuizRunner";
import { QuizHistory } from "@/components/quizzes/QuizHistory";
import { useLanguage } from "@/hooks/use-language";

export function PublishedQuizResolver({ quizSlug }: { quizSlug: string }) {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const localQuiz = getQuizBySlug(quizSlug);
  const studioQuiz =
    getPublishedStudioCourses(data)
      .flatMap((course) => course.quizzes)
      .find((item) => item.slug === quizSlug) ?? null;
  const quiz =
    localQuiz ?? (studioQuiz ? localizeStudioQuiz(studioQuiz, locale) : null);
  if (!quiz)
    return (
      <div className="mx-auto max-w-3xl p-10 text-center">
        {text(
          "Quiz introuvable ou non publié.",
          "Quiz not found or unpublished.",
        )}
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/assessments"
        className="inline-flex items-center gap-2 font-bold text-[#0B5D3B]"
      >
        <ArrowLeft size={18} />{" "}
        {text("Retour aux évaluations", "Back to assessments")}
      </Link>
      <header className="mt-7 rounded-[28px] border border-green-100 bg-white p-7">
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {quiz.code}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#063D2E]">
          {quiz.title}
        </h1>
        <p className="mt-4 text-slate-600">{quiz.description}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ListChecks, `${quiz.questions.length} questions`],
            [Clock3, `${quiz.durationMinutes} minutes`],
            [Trophy, `${quiz.passingScore}% ${text("requis", "required")}`],
            [
              RotateCcw,
              `${quiz.maxAttempts} ${text("tentatives", "attempts")}`,
            ],
          ].map(([Icon, label], index) => {
            const Component = Icon as typeof ListChecks;
            return (
              <div key={index} className="rounded-2xl bg-[#F8FAFC] p-4">
                <Component className="text-[#0B5D3B]" />
                <p className="mt-3 font-extrabold text-[#063D2E]">
                  {label as string}
                </p>
              </div>
            );
          })}
        </div>
      </header>
      <main className="mt-8">
        <QuizRunner quiz={quiz} />
      </main>
      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Historique de ce quiz", "Quiz history")}
        </h2>
        <div className="mt-6">
          <QuizHistory quizSlug={quiz.slug} />
        </div>
      </section>
    </div>
  );
}
