"use client";

import { AlertTriangle, Clock3, FileCheck2, ShieldCheck } from "lucide-react";

import type { ExamDefinition } from "@/types/exam";
import { useLanguage } from "@/hooks/use-language";

export function ExamInstructions({
  exam,
  onStart,
  onResume,
  hasSavedSession,
  disabled,
}: {
  exam: ExamDefinition;
  onStart: () => void;
  onResume: () => void;
  hasSavedSession: boolean;
  disabled: boolean;
}) {
  const { text } = useLanguage();
  const questionCount = exam.domainRules.reduce(
    (total, rule) => total + rule.numberOfQuestions,
    0,
  );

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7 md:p-9">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
        <ShieldCheck size={32} />
      </div>

      <h2 className="mt-6 text-3xl font-extrabold text-[#063D2E]">
        {text("Consignes de l’examen", "Exam instructions")}
      </h2>

      <p className="mt-4 leading-7 text-slate-600">
        {text(
          "Lisez attentivement les consignes avant de commencer. Votre progression sera enregistrée automatiquement sur cet ordinateur.",
          "Read the instructions carefully before starting. Your progress will be saved automatically on this computer.",
        )}
      </p>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <FileCheck2 className="text-[#0B5D3B]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {questionCount} questions
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <Clock3 className="text-[#0B5D3B]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {exam.durationMinutes} minutes
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <ShieldCheck className="text-[#F58220]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {exam.passingScore} % {text("requis", "required")}
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={22}
            className="mt-0.5 shrink-0 text-orange-600"
          />

          <div className="text-sm leading-6 text-orange-900">
            <p className="font-extrabold">
              {text("Règles importantes", "Important rules")}
            </p>

            <p className="mt-2">
              {text(
                "Évitez de changer d’onglet ou de réduire la fenêtre. Chaque sortie est comptabilisée. L’examen est soumis automatiquement lorsque le temps est écoulé.",
                "Do not change tabs or minimize the window. Every exit is recorded. The exam is submitted automatically when time expires.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        {hasSavedSession && (
          <button
            type="button"
            onClick={onResume}
            disabled={disabled}
            className="rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white disabled:opacity-50"
          >
            {text("Reprendre l’examen", "Resume exam")}
          </button>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className="rounded-full bg-[#F58220] px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {hasSavedSession
            ? text("Recommencer depuis le début", "Restart from the beginning")
            : text("Commencer l’examen", "Start exam")}
        </button>
      </div>
    </section>
  );
}
