"use client";

import {
  CheckCircle2,
  CircleX,
  GraduationCap,
} from "lucide-react";

import type {
  CertificationEligibilityResult,
} from "@/types/certification";
import { useLanguage } from "@/hooks/use-language";

export function CertificationEligibility({
  result,
}: {
  result: CertificationEligibilityResult;
}) {
  const { text } = useLanguage();
  const requirements = [
    {
      label:
        text("Formation terminée", "Course completed"),
      completed:
        result.courseCompleted,
      details:
        `${result.courseProgress} % ${text("de progression", "progress")}`,
    },

    {
      label:
        text("Quiz obligatoires réussis", "Required quizzes passed"),
      completed:
        result.quizzesCompleted,
      details:
        result.quizzesCompleted
          ? text("Tous les quiz sont réussis", "All quizzes are passed")
          : `${result.missingQuizSlugs.length} ${text("quiz restant(s)", "quiz(zes) remaining")}`,
    },

    {
      label:
        text("Examen final réussi", "Final exam passed"),
      completed:
        result.examCompleted,
      details:
        result.examScore !== null
          ? `Score : ${result.examScore} %`
          : text("Aucun examen réussi", "No exam passed"),
    },
  ];

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
          <GraduationCap
            size={29}
          />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Éligibilité au certificat", "Certificate eligibility")}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {text(
              "Vérification automatique des conditions de certification.",
              "Automatic verification of certification requirements.",
            )}
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {requirements.map(
          (requirement) => (
            <div
              key={
                requirement.label
              }
              className="flex items-start gap-4 rounded-2xl bg-[#F8FAFC] p-4"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  requirement.completed
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {requirement.completed ? (
                  <CheckCircle2
                    size={21}
                  />
                ) : (
                  <CircleX
                    size={21}
                  />
                )}
              </div>

              <div>
                <p className="font-extrabold text-[#063D2E]">
                  {
                    requirement.label
                  }
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    requirement.details
                  }
                </p>
              </div>
            </div>
          )
        )}
      </div>

      <div
        className={`mt-6 rounded-2xl p-4 text-sm font-bold ${
          result.eligible
            ? "bg-green-100 text-green-800"
            : "bg-orange-100 text-orange-800"
        }`}
      >
        {result.eligible
          ? text(
              "Toutes les conditions sont remplies. Votre certificat peut être généré.",
              "All requirements are met. Your certificate can be generated.",
            )
          : text(
              "Certaines conditions doivent encore être remplies.",
              "Some requirements still need to be met.",
            )}
      </div>
    </section>
  );
}
