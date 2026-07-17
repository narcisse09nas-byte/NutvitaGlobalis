"use client";

import { CheckCircle2, CircleX, Clock3, History } from "lucide-react";

import { useQuiz } from "@/hooks/use-quiz";
import { useLanguage } from "@/hooks/use-language";

type QuizHistoryProps = {
  quizSlug?: string;
};

export function QuizHistory({ quizSlug }: QuizHistoryProps) {
  const { locale, text } = useLanguage();
  const { attempts, isLoading } = useQuiz();

  const filteredAttempts = quizSlug
    ? attempts.filter((attempt) => attempt.quizSlug === quizSlug)
    : attempts;

  if (isLoading) {
    return (
      <div className="rounded-[24px] bg-white p-6">
        {text("Chargement…", "Loading…")}
      </div>
    );
  }

  if (filteredAttempts.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-10 text-center">
        <History size={40} className="mx-auto text-[#0B5D3B]" />

        <h3 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {text("Aucune tentative", "No attempt")}
        </h3>

        <p className="mt-2 text-slate-500">
          {text(
            "Vos résultats apparaîtront ici après votre premier quiz.",
            "Your results will appear here after your first quiz.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredAttempts.map((attempt, index) => (
        <article
          key={attempt.id}
          className="rounded-[24px] border border-green-100 bg-white p-6"
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  attempt.passed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {attempt.passed ? (
                  <CheckCircle2 size={25} />
                ) : (
                  <CircleX size={25} />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-[#F58220]">
                  {text("Tentative", "Attempt")}{" "}
                  {filteredAttempts.length - index}
                </p>

                <h3 className="mt-1 text-xl font-extrabold text-[#063D2E]">
                  {attempt.scorePercent}%
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {attempt.correctAnswers}/{attempt.totalQuestions}{" "}
                  {text("réponses correctes", "correct answers")}
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-500 md:text-right">
              <p>
                {new Date(attempt.submittedAt).toLocaleString(
                  locale === "fr" ? "fr-FR" : "en-US",
                )}
              </p>

              <p className="mt-2 inline-flex items-center gap-2">
                <Clock3 size={15} />
                {Math.floor(attempt.durationSeconds / 60)}m{" "}
                {attempt.durationSeconds % 60}s
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
