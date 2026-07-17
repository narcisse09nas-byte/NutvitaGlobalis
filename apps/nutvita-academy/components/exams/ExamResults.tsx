"use client";

import { CheckCircle2, CircleX, Trophy } from "lucide-react";

import type { ExamAttempt, ExamDefinition } from "@/types/exam";
import { useLanguage } from "@/hooks/use-language";

const domainLabels: Record<string, { fr: string; en: string }> = {
  fundamentals: { fr: "Fondamentaux", en: "Fundamentals" },
  anthropometry: { fr: "Anthropométrie", en: "Anthropometry" },
  screening: { fr: "Dépistage", en: "Screening" },
  clinical: { fr: "Évaluation clinique", en: "Clinical assessment" },
  cmam: { fr: "Prise en charge CMAM", en: "CMAM management" },
  monitoring: { fr: "Suivi et qualité", en: "Monitoring and quality" },
};

export function ExamResults({
  exam,
  attempt,
}: {
  exam: ExamDefinition;
  attempt: ExamAttempt;
}) {
  const { locale, text } = useLanguage();
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
          {attempt.passed ? <Trophy size={42} /> : <CircleX size={42} />}
        </div>

        <h2 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
          {attempt.passed
            ? text("Examen réussi", "Exam passed")
            : text("Examen non réussi", "Exam not passed")}
        </h2>

        <p className="mt-3 text-slate-600">
          {text("Votre score est de", "Your score is")}{" "}
          <strong>{attempt.scorePercent} %</strong>.{" "}
          {text("Le seuil requis est de", "The required score is")}{" "}
          <strong>{exam.passingScore} %</strong>.
        </p>

        <p className="mt-6 text-6xl font-extrabold text-[#0B5D3B]">
          {attempt.scorePercent} %
        </p>

        <div className="mx-auto mt-7 grid max-w-2xl gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xl font-extrabold text-[#063D2E]">
              {attempt.earnedPoints}/{attempt.maximumPoints}
            </p>

            <p className="text-xs text-slate-500">Points</p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xl font-extrabold text-[#063D2E]">
              {Math.floor(attempt.durationSeconds / 60)}m{" "}
              {attempt.durationSeconds % 60}s
            </p>

            <p className="text-xs text-slate-500">
              {text("Temps utilisé", "Time used")}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <p className="text-xl font-extrabold text-[#063D2E]">
              {attempt.focusViolations}
            </p>

            <p className="text-xs text-slate-500">
              {text("Sorties détectées", "Focus exits detected")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-green-100 bg-white p-7">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Résultats par domaine", "Results by domain")}
        </h2>

        <div className="mt-7 space-y-5">
          {attempt.domainResults.map((domainResult) => (
            <div key={domainResult.domain}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="font-bold text-[#063D2E]">
                  {domainLabels[domainResult.domain]?.[locale] ??
                    domainResult.domain}
                </p>

                <p className="font-extrabold text-[#0B5D3B]">
                  {domainResult.scorePercent}%
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-green-100">
                <div
                  className="h-full rounded-full bg-[#0B5D3B]"
                  style={{
                    width: `${domainResult.scorePercent}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Correction détaillée", "Detailed review")}
        </h2>

        <div className="mt-6 space-y-5">
          {attempt.corrections.map((correction, index) => (
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

                <div>
                  <p className="text-sm font-bold text-[#F58220]">
                    Question {index + 1}
                  </p>

                  <h3 className="mt-2 text-lg font-extrabold text-[#063D2E]">
                    {correction.question.prompt}
                  </h3>

                  <p className="mt-4 text-sm text-slate-600">
                    {text("Points obtenus", "Points earned")}:{" "}
                    <strong>
                      {correction.earnedPoints}/{correction.maximumPoints}
                    </strong>
                  </p>

                  <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
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
