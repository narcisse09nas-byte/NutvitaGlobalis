"use client";

import { Brain, GraduationCap, ShieldCheck } from "lucide-react";

import { AiInstructorChat } from "@/components/ai/AiInstructorChat";
import { useLanguage } from "@/hooks/use-language";

export default function AiTutorPage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        {text("Assistance pédagogique", "Learning support")}
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        NutVita AI Instructor
      </h1>

      <p className="mt-3 max-w-3xl text-slate-600">
        {text(
          "Posez des questions sur vos modules, clarifiez les concepts difficiles et obtenez des conseils de révision.",
          "Ask questions about your modules, clarify difficult concepts and get revision guidance.",
        )}
      </p>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AiInstructorChat />

        <aside className="space-y-5">
          <div className="rounded-[24px] border border-green-100 bg-white p-6">
            <Brain className="text-[#0B5D3B]" />

            <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
              {text("Explications ciblées", "Targeted explanations")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {text(
                "L’instructeur utilise la base pédagogique locale CAMMS.",
                "The instructor uses the local CAMMS knowledge base.",
              )}
            </p>
          </div>

          <div className="rounded-[24px] border border-green-100 bg-white p-6">
            <GraduationCap className="text-[#F58220]" />

            <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
              {text("Révision personnalisée", "Personalized revision")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {text(
                "Demandez des recommandations après un quiz ou un examen.",
                "Request recommendations after a quiz or exam.",
              )}
            </p>
          </div>

          <div className="rounded-[24px] border border-green-100 bg-white p-6">
            <ShieldCheck className="text-[#0B5D3B]" />

            <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
              {text("Mode local", "Local mode")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {text(
                "Aucune clé d’API n’est requise pour cette première version.",
                "No API key is required for this initial version.",
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
