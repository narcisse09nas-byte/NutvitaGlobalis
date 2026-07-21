"use client";

import Link from "next/link";

import { Clock3, ListChecks, RotateCcw, Trophy } from "lucide-react";

import type { QuizDefinition } from "@/types/quiz";

import { useQuiz } from "@/hooks/use-quiz";

import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/hooks/use-language";

type QuizCatalogCardProps = {
  quiz: QuizDefinition;
};

export function QuizCatalogCard({ quiz }: QuizCatalogCardProps) {
  const { text } = useLanguage();
  const { getQuizAttempts, getBestAttempt } = useQuiz();

  const attempts = getQuizAttempts(quiz.slug);

  const bestAttempt = getBestAttempt(quiz.slug);

  const attemptsRemaining = quiz.maxAttempts <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, quiz.maxAttempts - attempts.length);

  const canAttempt = attemptsRemaining > 0 || bestAttempt?.passed;

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
            {quiz.code}
          </span>

          {bestAttempt?.passed && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
              {text("Réussi", "Passed")}
            </span>
          )}
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {quiz.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {quiz.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <ListChecks className="text-[#0B5D3B]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {quiz.questions.length}
            </p>

            <p className="text-xs text-slate-500">
              {text("Questions", "Questions")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <Clock3 className="text-[#0B5D3B]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {quiz.durationMinutes} min
            </p>

            <p className="text-xs text-slate-500">
              {text("Durée", "Duration")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <Trophy className="text-[#F58220]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {quiz.passingScore}%
            </p>

            <p className="text-xs text-slate-500">
              {text("Score minimal", "Passing score")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <RotateCcw className="text-[#0B5D3B]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {Number.isFinite(attemptsRemaining) ? attemptsRemaining : text("Illimitees", "Unlimited")}
            </p>

            <p className="text-xs text-slate-500">
              {text("Tentatives restantes", "Attempts remaining")}
            </p>
          </div>
        </div>

        {bestAttempt && (
          <div className="mt-5 rounded-2xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-slate-600">
              {text("Meilleur score", "Best score")}
            </p>

            <p className="mt-1 text-2xl font-extrabold text-[#0B5D3B]">
              {bestAttempt.scorePercent}%
            </p>
          </div>
        )}
      </div>

      <Link
        href={`/dashboard/assessments/${quiz.slug}`}
        className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition ${
          canAttempt
            ? "bg-[#F58220] text-white hover:bg-orange-600"
            : "cursor-not-allowed bg-slate-200 text-slate-500"
        }`}
      >
        {bestAttempt?.passed
          ? text("Consulter les résultats", "View results")
          : attempts.length > 0
            ? text("Nouvelle tentative", "New attempt")
            : text("Commencer le quiz", "Start quiz")}
      </Link>
    </Card>
  );
}