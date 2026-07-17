"use client";

import { GraduationCap } from "lucide-react";

import { examDefinitions } from "@/data/exam-definitions";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import {
  getPublishedStudioCourses,
  localizeStudioExam,
} from "@/lib/studio-course-runtime";
import { useLanguage } from "@/hooks/use-language";

import { ExamCatalogCard } from "@/components/exams/ExamCatalogCard";
import { ExamHistory } from "@/components/exams/ExamHistory";

export default function ExamsPage() {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const studioExams = getPublishedStudioCourses(data).flatMap((course) =>
    course.finalExam
      ? [localizeStudioExam(course.finalExam, locale).definition]
      : [],
  );
  const exams = [
    ...examDefinitions,
    ...studioExams.filter(
      (exam) => !examDefinitions.some((item) => item.slug === exam.slug),
    ),
  ];
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Certification", "Certification")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("Examens finaux", "Final exams")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Passez les examens certifiants, consultez vos résultats et suivez vos performances par domaine.",
            "Take certification exams, review your results and track performance by domain.",
          )}
        </p>
      </header>

      {exams.length > 0 ? (
        <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <ExamCatalogCard key={exam.id} exam={exam} />
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
          <GraduationCap size={44} className="mx-auto text-[#0B5D3B]" />

          <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
            {text("Aucun examen disponible", "No exam available")}
          </h2>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Historique des examens", "Exam history")}
        </h2>

        <div className="mt-6">
          <ExamHistory />
        </div>
      </section>
    </div>
  );
}
