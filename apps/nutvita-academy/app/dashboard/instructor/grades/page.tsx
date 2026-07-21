"use client";

import { InstructorGradebook } from "@/components/instructor/InstructorGradebook";
import { ExerciseSubmissionGrader } from "@/components/instructor/ExerciseSubmissionGrader";
import { FinalGradeOverview } from "@/components/grades/FinalGradeOverview";
import { useLanguage } from "@/hooks/use-language";

export default function InstructorGradesPage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Instructor Studio
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Notes et résultats", "Grades and results")}
      </h1>
      <p className="mt-3 text-slate-600">
        {text(
          "Suivez les évaluations et ajoutez les appréciations pédagogiques.",
          "Track assessments and add learning feedback.",
        )}
      </p>
      <div className="mt-8">
        <div className="space-y-7"><FinalGradeOverview /><ExerciseSubmissionGrader /><InstructorGradebook /></div>
      </div>
    </div>
  );
}