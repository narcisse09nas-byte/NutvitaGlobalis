"use client";

import { AiProWorkspace } from "@/components/ai-pro/AiProWorkspace";
import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";
import { useLanguage } from "@/hooks/use-language";

export default function AiProPage() {
  const { text } = useLanguage();
  return (
    <LocalRoleGuard allowedRoles={["instructor", "admin", "super_admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Intelligence pédagogique", "Learning intelligence")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          NutVita AI Instructor Pro
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Générez des explications, résumés, fiches, quiz, cas pratiques et plans d’étude.",
            "Generate explanations, summaries, study sheets, quizzes, case studies and study plans.",
          )}
        </p>

        <div className="mt-8">
          <AiProWorkspace />
        </div>
      </div>
    </LocalRoleGuard>
  );
}
