"use client";

import Link from "next/link";

import { Clock3, FileCheck2, RotateCcw, Trophy } from "lucide-react";

import { useExam } from "@/hooks/use-exam";

import type { ExamDefinition } from "@/types/exam";

import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/hooks/use-language";

export function ExamCatalogCard({ exam }: { exam: ExamDefinition }) {
  const { text } = useLanguage();
  const { getAttemptsByExam, getBestAttempt } = useExam();

  const attempts = getAttemptsByExam(exam.slug);

  const bestAttempt = getBestAttempt(exam.slug);

  const attemptsRemaining = exam.maxAttempts <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, exam.maxAttempts - attempts.length);

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
            {exam.code}
          </span>

          {bestAttempt?.passed && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
              {text("Examen rÃ©ussi", "Exam passed")}
            </span>
          )}
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {exam.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {exam.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <FileCheck2 className="text-[#0B5D3B]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {exam.domainRules.reduce(
                (total, rule) => total + rule.numberOfQuestions,
                0,
              )}
            </p>

            <p className="text-xs text-slate-500">
              {text("Questions tirÃ©es", "Selected questions")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <Clock3 className="text-[#0B5D3B]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {exam.durationMinutes} min
            </p>

            <p className="text-xs text-slate-500">
              {text("DurÃ©e", "Duration")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <Trophy className="text-[#F58220]" />

            <p className="mt-3 font-extrabold text-[#063D2E]">
              {exam.passingScore} %
            </p>

            <p className="text-xs text-slate-500">
              {text("Score requis", "Required score")}
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
            <p className="text-sm text-slate-600">
              {text("Meilleur score", "Best score")}
            </p>

            <p className="mt-1 text-3xl font-extrabold text-[#0B5D3B]">
              {bestAttempt.scorePercent} %
            </p>
          </div>
        )}
      </div>

      <Link
        href="/dashboard/exams/schedule"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#F58220] px-5 text-sm font-bold text-white transition hover:bg-orange-600"
      >
        {bestAttempt?.passed
          ? text("Consulter lâ€™examen", "View exam")
          : attempts.length > 0
            ? text("Nouvelle tentative", "New attempt")
            : text("AccÃ©der Ã  lâ€™examen", "Access exam")}
      </Link>
    </Card>
  );
}