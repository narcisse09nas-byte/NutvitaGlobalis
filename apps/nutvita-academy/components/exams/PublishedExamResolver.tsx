"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  FileCheck2,
  LockKeyhole,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { getExamDefinitionBySlug } from "@/data/exam-definitions";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import {
  getPublishedStudioCourses,
  localizeStudioExam,
} from "@/lib/studio-course-runtime";
import { ExamHistory } from "@/components/exams/ExamHistory";
import { useLanguage } from "@/hooks/use-language";

export function PublishedExamResolver({ examSlug }: { examSlug: string }) {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const rawStudioBundle =
    getPublishedStudioCourses(data)
      .flatMap((course) => (course.finalExam ? [course.finalExam] : []))
      .find((item) => item.definition.slug === examSlug) ?? null;
  const studioBundle = rawStudioBundle
    ? localizeStudioExam(rawStudioBundle, locale)
    : null;
  const exam =
    getExamDefinitionBySlug(examSlug) ?? studioBundle?.definition ?? null;
  if (!exam)
    return (
      <div className="mx-auto max-w-3xl p-10 text-center">
        {text(
          "Examen introuvable ou non publié.",
          "Exam not found or unpublished.",
        )}
      </div>
    );
  const questionCount =
    exam.blueprint
      ? exam.blueprint.qcmCount + exam.blueprint.qcuCount + exam.blueprint.caseStudyCount
      : studioBundle?.questions.length ??
        exam.domainRules.reduce((total, rule) => total + rule.numberOfQuestions, 0);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/exams"
        className="inline-flex items-center gap-2 font-bold text-[#0B5D3B]"
      >
        <ArrowLeft size={18} /> {text("Retour aux examens", "Back to exams")}
      </Link>
      <header className="mt-7 rounded-[28px] border border-green-100 bg-white p-7">
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {exam.code}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#063D2E]">
          {exam.title}
        </h1>
        <p className="mt-4 text-slate-600">{exam.description}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [FileCheck2, `${questionCount} questions`],
            [Clock3, `${exam.durationMinutes} minutes`],
            [Trophy, `${exam.passingScore}% ${text("requis", "required")}`],
            [
              RotateCcw,
              `${exam.maxAttempts} ${text("tentatives", "attempts")}`,
            ],
          ].map(([Icon, label], index) => {
            const Component = Icon as typeof FileCheck2;
            return (
              <div key={index} className="rounded-2xl bg-[#F8FAFC] p-4">
                <Component className="text-[#0B5D3B]" />
                <p className="mt-3 font-extrabold text-[#063D2E]">
                  {label as string}
                </p>
              </div>
            );
          })}
        </div>
      </header>
      <main className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-center">
        <LockKeyhole className="mx-auto text-[#0B5D3B]" size={44} />
        <h2 className="mt-4 text-2xl font-extrabold text-[#063D2E]">
          {text("Accès certifiant sécurisé", "Secure certification access")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          {text(
            "L’examen ne peut plus être lancé depuis une URL directe. Terminez le parcours, réservez un créneau, faites valider votre identité puis entrez dans la salle activée par l’examinateur.",
            "The exam cannot be started from a direct URL. Complete the course, book a time slot, verify your identity and enter the room activated by the examiner.",
          )}
        </p>
        <Link
          href="/dashboard/exams/schedule"
          className="mt-6 inline-flex rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          {text("Planifier mon examen", "Schedule my exam")}
        </Link>
      </main>
      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Historique de cet examen", "Exam history")}
        </h2>
        <div className="mt-6">
          <ExamHistory examSlug={exam.slug} />
        </div>
      </section>
    </div>
  );
}
