"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { examDefinitions } from "@/data/exam-definitions";
import { examQuestionBank } from "@/data/exam-question-bank";
import { getCertificationRequirement } from "@/data/certification-rules";
import { getLocalCourseBySlug } from "@/lib/course-catalog";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useProgress } from "@/hooks/use-progress";
import { useQuiz } from "@/hooks/use-quiz";
import { useExam } from "@/hooks/use-exam";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useProctoring } from "@/hooks/use-proctoring";
import { getPublishedStudioCourses, studioCourseToAcademyCourse } from "@/lib/studio-course-runtime";
import { useLanguage } from "@/hooks/use-language";
import { CERTIFICATION_EXAM_BLUEPRINT, createExamPaper, getQuestionPoolCapacity } from "@/lib/exam-engine";
import { evaluateExamBookingPolicy } from "@/lib/exam-attempt-policy";

export function ExamScheduling() {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();
  const { data: progressData, getCourseSummary } = useProgress();
  const { attempts } = useQuiz();
  const { attempts: examAttempts } = useExam();
  const { data: studioData } = useInstructorStudio();
  const { data, requestBooking } = useProctoring();

  const studioCourses = getPublishedStudioCourses(studioData);
  const exams = [...examDefinitions.map((exam) => ({ exam, questionPool: examQuestionBank, course: getLocalCourseBySlug(exam.courseSlug), requiredQuizzes: getCertificationRequirement(exam.courseSlug)?.requiredQuizSlugs ?? [] })), ...studioCourses.flatMap((course) => course.finalExam ? [{ exam: course.finalExam.definition, questionPool: course.finalExam.questions, course: studioCourseToAcademyCourse(course), requiredQuizzes: course.quizzes.map((quiz) => quiz.slug) }] : [])];

  return <div className="space-y-8">
    <div className="rounded-[28px] border border-green-100 bg-white p-7">
      <div className="flex items-center gap-3"><ShieldCheck className="text-[#0B5D3B]" /><h2 className="text-2xl font-extrabold text-[#063D2E]">{text("Conditions d’éligibilité", "Eligibility requirements")}</h2></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">{[text("Cours et cas pratiques terminés", "Courses and case studies completed"), text("Tous les quiz obligatoires réussis", "All required quizzes passed"), text(`Créneau réservé au moins ${data.policy.minimumLeadDays} jours avant`, `Slot booked at least ${data.policy.minimumLeadDays} days in advance`)].map((label) => <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#F8FAFC] p-4 text-sm font-semibold text-slate-700"><CheckCircle2 size={18} className="shrink-0 text-[#0B5D3B]" />{label}</div>)}</div>
    </div>

    {exams.map(({ exam, questionPool, course, requiredQuizzes }) => {
      if (!course) return null;
      const lessonIds = course.modules.flatMap((module) => module.lessons.filter((lesson) => lesson.type !== "resource").map((lesson) => lesson.id));
      const summary = getCourseSummary(course.slug, lessonIds);
      const quizzes = requiredQuizzes;
      const passed = new Set(attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.quizSlug));
      const missingQuizzes = quizzes.filter((slug) => !passed.has(slug));
      const caseIds = course.modules.flatMap((module) => module.lessons.filter((lesson) => lesson.type === "case-study").map((lesson) => lesson.id));
      const completedCaseIds = new Set(Object.values(progressData.lessons).filter((lesson) => lesson.courseSlug === course.slug && lesson.status === "completed").map((lesson) => lesson.lessonId));
      const casesComplete = caseIds.every((id) => completedCaseIds.has(id));
      const eligible = summary.progressPercent >= 100 && missingQuizzes.length === 0 && casesComplete;
      const slots = data.slots.filter((slot) => slot.examSlug === exam.slug && new Date(slot.startsAt) > new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const ownBookings = data.bookings.filter((booking) => booking.userId === user?.id && booking.examSlug === exam.slug);
      const bookingPolicy = user
        ? evaluateExamBookingPolicy({
            userId: user.id,
            definition: exam,
            attempts: examAttempts,
            bookings: data.bookings,
          })
        : null;
      const earliestSlot = bookingPolicy?.earliestSlotAt
        ? new Date(bookingPolicy.earliestSlotAt)
        : null;
      const previousFingerprints = ownBookings.flatMap((booking) =>
        booking.paper?.fingerprint ? [booking.paper.fingerprint] : [],
      );
      const poolCapacity = getQuestionPoolCapacity(questionPool);
      const poolReady =
        poolCapacity.qcm >= CERTIFICATION_EXAM_BLUEPRINT.qcmCount &&
        poolCapacity.qcu >= CERTIFICATION_EXAM_BLUEPRINT.qcuCount &&
        poolCapacity.case_study >= CERTIFICATION_EXAM_BLUEPRINT.caseStudyCount;

      return <section key={exam.slug} className="rounded-[28px] border border-green-100 bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold uppercase tracking-[0.15em] text-[#F58220]">{exam.code}</p><h2 className="mt-2 text-2xl font-extrabold text-[#063D2E]">{exam.title}</h2></div><span className={`rounded-full px-4 py-2 text-xs font-bold ${eligible ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>{eligible ? text("Éligible", "Eligible") : text("Parcours incomplet", "Learning path incomplete")}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric ok={summary.progressPercent >= 100} label={`${text("Progression", "Progress")} ${summary.progressPercent}%`} /><Metric ok={missingQuizzes.length === 0} label={missingQuizzes.length === 0 ? text("Quiz réussis", "Quizzes passed") : `${missingQuizzes.length} ${text("quiz manquant(s)", "missing quiz(zes)")}`} /><Metric ok={casesComplete} label={casesComplete ? text("Cas pratiques validés", "Case studies completed") : text("Cas pratiques à terminer", "Case studies to complete")} /></div>

        {bookingPolicy && bookingPolicy.status !== "first_attempt" && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
            {bookingPolicy.status === "active_booking"
              ? text("Une réservation est déjà active pour cette tentative.", "A booking is already active for this attempt.")
              : bookingPolicy.status === "awaiting_conduct_review"
                ? text("Résultat réussi : décision finale du surveillant en attente.", "Passed result: awaiting the proctor’s final decision.")
                : bookingPolicy.status === "certified"
                  ? text("Examen et conditions de surveillance validés.", "Exam and proctoring conditions approved.")
                  : bookingPolicy.status === "attempts_exhausted"
                    ? text("Les trois tentatives autorisées sont épuisées.", "All three authorized attempts have been used.")
                    : text(
                        `Tentative ${bookingPolicy.attemptNumber}/3 : choisissez un créneau à partir du ${earliestSlot?.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}.`,
                        `Attempt ${bookingPolicy.attemptNumber}/3: choose a slot on or after ${earliestSlot?.toLocaleDateString("en-US")}.`,
                      )}
          </div>
        )}

        {!poolReady && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {text(
              `Banque incomplète : ${poolCapacity.qcm}/50 QCM, ${poolCapacity.qcu}/35 QCU et ${poolCapacity.case_study}/15 cas pratiques. Réservation suspendue jusqu’au chargement par le Studio.`,
              `Incomplete bank: ${poolCapacity.qcm}/50 MCQ, ${poolCapacity.qcu}/35 SCQ and ${poolCapacity.case_study}/15 case studies. Booking is suspended until the Studio bank is loaded.`,
            )}
          </div>
        )}

        {ownBookings.length > 0 && <div className="mt-5 space-y-2">{ownBookings.map((booking) => { const slot = data.slots.find((item) => item.id === booking.slotId); return <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-100 bg-green-50 p-4"><div><p className="font-bold text-[#063D2E]">{text("Demande", "Request")} : {booking.status}</p><p className="text-sm text-slate-600">{slot ? new Date(slot.startsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US") : text("Créneau supprimé", "Slot deleted")}</p></div>{booking.status === "approved" && <Link href={`/dashboard/exams/proctoring/${booking.id}`} className="rounded-full bg-[#0B5D3B] px-5 py-2.5 text-sm font-bold text-white">{text("Accéder à la salle", "Enter room")}</Link>}</div>; })}</div>}

        <div className="mt-6">
          <h3 className="font-extrabold text-[#063D2E]">{text("Créneaux disponibles", "Available slots")}</h3>
          {slots.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{text("Aucun créneau n’a encore été publié par l’administration.", "No slot has been published by the administration yet.")}</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {slots.map((slot) => {
                const occupied = data.bookings.filter((booking) => booking.slotId === slot.id && !["rejected", "cancelled"].includes(booking.status)).length;
                const slotTooEarly = Boolean(earliestSlot && new Date(slot.startsAt) < earliestSlot);
                const canRequest = eligible && poolReady && Boolean(user) && Boolean(bookingPolicy?.canBook) && !slotTooEarly && occupied < slot.capacity;
                return (
                  <div key={slot.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 font-bold text-[#063D2E]"><CalendarDays size={18} />{new Date(slot.startsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Clock3 size={15} />{slot.durationMinutes} min · {slot.capacity - occupied} {text("place(s)", "seat(s)")}</p>
                    {slotTooEarly && <p className="mt-2 text-xs font-bold text-amber-700">{text("Créneau trop proche pour cette reprise.", "This slot is too early for this retake.")}</p>}
                    <button
                      type="button"
                      disabled={!canRequest}
                      onClick={() => {
                        if (!user || !bookingPolicy) return;
                        try {
                          const paper = createExamPaper({
                            userId: user.id,
                            definition: exam,
                            questionPool,
                            attemptNumber: bookingPolicy.attemptNumber,
                            excludedFingerprints: previousFingerprints,
                          });
                          const result = requestBooking({
                            slotId: slot.id,
                            userId: user.id,
                            candidateName: user.fullName,
                            candidateEmail: user.email,
                            courseSlug: course.slug,
                            examSlug: exam.slug,
                            attemptNumber: bookingPolicy.attemptNumber,
                            paper,
                          });
                          window.alert(result.success ? text("Demande transmise et épreuve individualisée scellée.", "Request sent and individualized exam paper sealed.") : result.error);
                        } catch (error) {
                          const message = error instanceof Error && error.message.startsWith("QUESTION_POOL_INSUFFICIENT")
                            ? text("La banque ne contient pas encore les 50 QCM, 35 QCU et 15 cas pratiques requis.", "The bank does not yet contain the required 50 MCQ, 35 SCQ and 15 case studies.")
                            : text("Impossible de générer une nouvelle épreuve distincte.", "Unable to generate a distinct new exam paper.");
                          window.alert(message);
                        }
                      }}
                      className="mt-4 w-full rounded-full bg-[#F58220] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {!eligible ? text("Terminer le parcours", "Complete the learning path") : text(`Réserver la tentative ${bookingPolicy?.attemptNumber ?? 1}/3`, `Book attempt ${bookingPolicy?.attemptNumber ?? 1}/3`)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>;
    })}
  </div>;

}

function Metric({ ok, label }: { ok: boolean; label: string }) {
  return <div className={`flex items-center gap-2 rounded-2xl p-4 text-sm font-bold ${ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{ok ? <CheckCircle2 size={18} /> : <LockKeyhole size={18} />}{label}</div>;
}
