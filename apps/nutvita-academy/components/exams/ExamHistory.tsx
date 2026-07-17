"use client";

import { CheckCircle2, CircleX, Clock3 } from "lucide-react";

import { useExam } from "@/hooks/use-exam";
import { useLanguage } from "@/hooks/use-language";

export function ExamHistory({ examSlug }: { examSlug?: string }) {
  const { locale, text } = useLanguage();
  const { attempts, isLoading } = useExam();

  const filtered = examSlug
    ? attempts.filter((attempt) => attempt.examSlug === examSlug)
    : attempts;

  if (isLoading) {
    return (
      <div className="rounded-[24px] bg-white p-6">
        {text("Chargement…", "Loading…")}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-10 text-center text-slate-500">
        {text("Aucun examen enregistré.", "No recorded exam.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((attempt, index) => (
        <article
          key={attempt.id}
          className="rounded-[24px] border border-green-100 bg-white p-6"
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
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
                  {text("Tentative", "Attempt")} {filtered.length - index}
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[#063D2E]">
                  {attempt.scorePercent} %
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {attempt.passed
                    ? text("Réussi", "Passed")
                    : text("Non réussi", "Not passed")}
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
