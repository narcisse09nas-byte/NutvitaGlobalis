"use client";

import { CheckCircle2, CircleX, RotateCcw, Trophy } from "lucide-react";

import type { QuizDefinition, QuizResult } from "@/types/quiz";
import { useLanguage } from "@/hooks/use-language";

type QuizResultsProps = {
  quiz: QuizDefinition;
  result: QuizResult;
  canRetry: boolean;
  onRetry: () => void;
};

export function QuizResults({
  quiz,
  result,
  canRetry,
  onRetry,
}: QuizResultsProps) {
  const { text } = useLanguage();
  const { attempt, corrections } = result;

  return (
    <div className="space-y-8">
      <section
        className={`rounded-[28px] border p-8 text-center ${
          attempt.passed
            ? "border-green-200 bg-green-50"
            : "border-orange-200 bg-orange-50"
        }`}
      >
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            attempt.passed
              ? "bg-green-100 text-green-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {attempt.passed ? <Trophy size={40} /> : <CircleX size={40} />}
        </div>

        <h2 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
          {attempt.passed
            ? text("Quiz réussi", "Quiz passed")
            : text("Quiz non réussi", "Quiz not passed")}
        </h2>

        <p className="mt-3 text-slate-600">
          {text("Score obtenu", "Score")}:{" "}
          <strong>{attempt.scorePercent}%</strong>.{" "}
          {text("Score minimal requis", "Required score")}:{" "}
          <strong>{quiz.passingScore}%</strong>.
        </p>

        <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-3xl font-extrabold text-[#0B5D3B]">
              {attempt.correctAnswers}/{attempt.totalQuestions}
            </p>

            <p className="text-sm text-slate-500">
              {text("Bonnes réponses", "Correct answers")}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-3xl font-extrabold text-[#0B5D3B]">
              {Math.floor(attempt.durationSeconds / 60)}m{" "}
              {attempt.durationSeconds % 60}s
            </p>

            <p className="text-sm text-slate-500">
              {text("Temps utilisé", "Time used")}
            </p>
          </div>
        </div>

        {!attempt.passed && canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
          >
            <RotateCcw size={18} />
            {text("Recommencer le quiz", "Retake quiz")}
          </button>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Correction détaillée", "Detailed review")}
        </h2>

        <div className="mt-6 space-y-5">
          {corrections.map((correction, index) => (
            <article
              key={correction.question.id}
              className="rounded-[24px] border border-green-100 bg-white p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    correction.isCorrect
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {correction.isCorrect ? (
                    <CheckCircle2 size={21} />
                  ) : (
                    <CircleX size={21} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#F58220]">
                    Question {index + 1}
                  </p>

                  <h3 className="mt-2 text-lg font-extrabold text-[#063D2E]">
                    {correction.question.prompt}
                  </h3>

                  <div className="mt-5 space-y-2">
                    {correction.question.options.map((option) => {
                      const selected = correction.selectedOptionIds.includes(
                        option.id,
                      );

                      const correct =
                        correction.question.correctOptionIds.includes(
                          option.id,
                        );

                      return (
                        <div
                          key={option.id}
                          className={`rounded-xl border px-4 py-3 text-sm ${
                            correct
                              ? "border-green-200 bg-green-50 text-green-800"
                              : selected
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-slate-100 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {option.text}

                          {correct && (
                            <span className="ml-2 font-bold">
                              ✓ {text("Bonne réponse", "Correct answer")}
                            </span>
                          )}

                          {selected && !correct && (
                            <span className="ml-2 font-bold">
                              ✕ {text("Votre réponse", "Your answer")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4">
                    <p className="text-sm font-bold text-[#063D2E]">
                      {text("Explication", "Explanation")}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {correction.question.explanation}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
