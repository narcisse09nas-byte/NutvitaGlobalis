"use client";

import { ExaminerCockpit } from "@/components/proctoring/ExaminerCockpit";
import { useLanguage } from "@/hooks/use-language";

export default function ProctoringAdministrationPage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        {text("Certification internationale", "International certification")}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Salle d’examen sécurisée", "Secure examination room")}
      </h1>
      <p className="mt-3 max-w-4xl text-slate-600">
        {text(
          "Planifiez les créneaux, validez les candidats, contrôlez leur identité et supervisez jusqu’à dix compositions simultanées.",
          "Schedule time slots, approve candidates, verify identity and supervise up to ten exams simultaneously.",
        )}
      </p>
      <div className="mt-8">
        <ExaminerCockpit />
      </div>
    </div>
  );
}
