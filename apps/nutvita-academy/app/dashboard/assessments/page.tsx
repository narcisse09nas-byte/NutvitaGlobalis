"use client";

import { ClipboardCheck } from "lucide-react";

import { quizBank } from "@/data/quiz-bank";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import {
  getPublishedStudioCourses,
  localizeStudioQuiz,
} from "@/lib/studio-course-runtime";
import { useLanguage } from "@/hooks/use-language";

import { QuizCatalogCard } from "@/components/quizzes/QuizCatalogCard";
import { QuizHistory } from "@/components/quizzes/QuizHistory";

export default function AssessmentsPage() {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const studioQuizzes = getPublishedStudioCourses(data).flatMap((course) =>
    course.quizzes.map((quiz) => localizeStudioQuiz(quiz, locale)),
  );
  const quizzes = [
    ...quizBank,
    ...studioQuizzes.filter(
      (quiz) => !quizBank.some((item) => item.slug === quiz.slug),
    ),
  ];
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Évaluations", "Assessments")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("Quiz et examens", "Quizzes and exams")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Testez vos connaissances, consultez vos scores et suivez l’historique de vos tentatives.",
            "Test your knowledge, review your scores and track your attempt history.",
          )}
        </p>
      </header>

      {quizzes.length > 0 ? (
        <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCatalogCard key={quiz.id} quiz={quiz} />
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
          <ClipboardCheck size={42} className="mx-auto text-[#0B5D3B]" />

          <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
            {text("Aucun quiz disponible", "No quiz available")}
          </h2>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Historique récent", "Recent history")}
        </h2>

        <div className="mt-6">
          <QuizHistory />
        </div>
      </section>
    </div>
  );
}
