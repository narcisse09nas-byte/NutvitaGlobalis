"use client";

import { Award } from "lucide-react";
import { getLocalCourseBySlug } from "@/lib/course-catalog";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useProgress } from "@/hooks/use-progress";
import { useQuiz } from "@/hooks/use-quiz";
import { useExam } from "@/hooks/use-exam";
import { useCertificates } from "@/hooks/use-certificates";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { evaluateCertificationEligibility } from "@/lib/certificate-engine";
import {
  getPublishedStudioCourses,
  getStudioCertificationRequirement,
  studioCourseToAcademyCourse,
} from "@/lib/studio-course-runtime";
import { CertificationEligibility } from "@/components/certification/CertificationEligibility";
import { IssueCertificateButton } from "@/components/certification/IssueCertificateButton";
import { CertificateCard } from "@/components/certification/CertificateCard";
import { useLanguage } from "@/hooks/use-language";
import { loadExerciseSubmissions } from "@/lib/application-exercise-storage";
import { calculateFinalGrade } from "@/lib/final-grade-engine";

export default function CertificatesPage() {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();
  const { data } = useInstructorStudio();
  const { getCourseSummary } = useProgress();
  const { attempts: quizAttempts } = useQuiz();
  const { attempts: examAttempts } = useExam();
  const { certificates, isLoading } = useCertificates();
  const camms = getLocalCourseBySlug("camms");
  const candidates = [
    ...(camms ? [{ course: camms, requirement: undefined }] : []),
    ...getPublishedStudioCourses(data)
      .filter((item) => item.certification.enabled)
      .map((item) => ({
        course: studioCourseToAcademyCourse(item, locale),
        requirement: getStudioCertificationRequirement(item),
      })),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Certification
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Mes certificats", "My certificates")}
      </h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        {text(
          "Vérifiez votre éligibilité, générez et consultez vos certificats professionnels.",
          "Check your eligibility, generate and review your professional certificates.",
        )}
      </p>
      <div className="mt-10 space-y-8">
        {candidates.map(({ course, requirement }) => {
          const lessonIds = course.modules.flatMap((module) =>
            module.lessons
              .filter((lesson) => lesson.type !== "resource")
              .map((lesson) => lesson.id),
          );
          const progressSummary = getCourseSummary(course.slug, lessonIds);
          const studioCourse = data.courses.find((item) => item.slug === course.slug);
          const grade = calculateFinalGrade({ courseSlug: course.slug, quizSlugs: studioCourse?.quizzes.map((quiz) => quiz.slug) ?? requirement?.requiredQuizSlugs ?? [], quizAttempts, examSlug: studioCourse?.finalExam?.definition.slug ?? requirement?.requiredExamSlug ?? "", examAttempts, exercisesCount: studioCourse?.applicationExercises?.length ?? 0, submissions: loadExerciseSubmissions().filter((item) => item.studentUserId === user?.id) });
          const baseEligibility = evaluateCertificationEligibility({
            course,
            progressSummary,
            quizAttempts,
            examAttempts,
            requirement,
          });
          const eligibility = {
            ...baseEligibility,
            eligible: baseEligibility.eligible && grade.passed,
            finalScore: grade.finalScore,
            quizScore: grade.quizScore,
            exerciseScore: grade.exerciseScore,
            reasons: grade.passed
              ? baseEligibility.reasons
              : [...baseEligibility.reasons, "La note finale ponderee doit atteindre 70 %."],
          };
          return (
            <section key={course.slug}>
              <h2 className="mb-4 text-2xl font-extrabold text-[#063D2E]">
                {course.title}
              </h2>
              <CertificationEligibility result={eligibility} />
              <div className="mt-5 flex justify-end">
                <IssueCertificateButton
                  course={course}
                  eligibility={eligibility}
                />
              </div>
            </section>
          );
        })}
        {candidates.length === 0 && (
          <div className="rounded-[24px] bg-white p-8 text-center text-slate-500">
            {text(
              "Aucune formation certifiante publiée.",
              "No published certification course.",
            )}
          </div>
        )}
      </div>
      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Certificats délivrés", "Issued certificates")}
        </h2>
        {isLoading ? (
          <p className="mt-6">{text("Chargement…", "Loading…")}</p>
        ) : certificates.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
            <Award size={44} className="mx-auto text-[#0B5D3B]" />
            <h3 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
              {text("Aucun certificat délivré", "No certificate issued")}
            </h3>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {certificates.map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}