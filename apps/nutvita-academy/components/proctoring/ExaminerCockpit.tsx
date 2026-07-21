"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  MonitorUp,
  ShieldAlert,
  Users,
} from "lucide-react";
import { examDefinitions } from "@/data/exam-definitions";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useProctoring } from "@/hooks/use-proctoring";
import { getPublishedStudioCourses } from "@/lib/studio-course-runtime";
import { studioCourseToAcademyCourse } from "@/lib/studio-course-runtime";
import { getLocalCourseBySlug } from "@/lib/course-catalog";
import { createCertificateRecord } from "@/lib/certificate-engine";
import { saveCertificate } from "@/lib/certificate-storage";
import { loadQuizAttempts } from "@/lib/quiz-storage";
import { loadExamAttempts } from "@/lib/exam-storage";
import { loadExerciseSubmissions } from "@/lib/application-exercise-storage";
import { calculateFinalGrade } from "@/lib/final-grade-engine";
import { pushNotificationForUser } from "@/lib/notification-storage";
import { ProctoringAiReadiness } from "@/components/proctoring/ProctoringAiReadiness";
import { useLanguage } from "@/hooks/use-language";
import type { ExamConductRating } from "@/types/proctoring";

export function ExaminerCockpit() {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();
  const { data: studioData } = useInstructorStudio();
  const {
    data,
    createSlot,
    reviewBooking,
    reviewIdentity,
    reviewConduct,
    setRoomStatus,
    ejectCandidate,
  } = useProctoring();
  const exams = [
    ...examDefinitions,
    ...getPublishedStudioCourses(studioData).flatMap((course) =>
      course.finalExam ? [course.finalExam.definition] : [],
    ),
  ];
  const publishedStudioCourses = getPublishedStudioCourses(studioData);
  const [examSlug, setExamSlug] = useState(exams[0]?.slug ?? "");
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(90);
  const [capacity, setCapacity] = useState(10);
  const [selectedSlot, setSelectedSlot] = useState(data.slots[0]?.id ?? "");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [matches, setMatches] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const activeSlotId = selectedSlot || data.slots[0]?.id || "";
  const candidates = useMemo(
    () =>
      data.bookings
        .filter(
          (booking) =>
            booking.slotId === activeSlotId && booking.status === "approved",
        )
        .slice(0, data.policy.maximumCandidates),
    [activeSlotId, data.bookings, data.policy.maximumCandidates],
  );
  const slot = data.slots.find((item) => item.id === activeSlotId);
  const incidents = data.incidents.filter((incident) =>
    candidates.some((candidate) => candidate.id === incident.bookingId),
  );

  function submitSlot(event: React.FormEvent) {
    event.preventDefault();
    const exam = exams.find((item) => item.slug === examSlug);
    if (!exam || !user) return;
    const [hours, minutes] = time.split(":").map(Number);
    const next = new Date(); next.setDate(next.getDate() + data.policy.minimumLeadDays); next.setHours(hours, minutes, 0, 0);
    next.setDate(next.getDate() + ((weekday - next.getDay() + 7) % 7 || (next <= new Date() ? 7 : 0)));
    const result = createSlot({
      courseSlug: exam.courseSlug,
      examSlug: exam.slug,
      startsAt: next.toISOString(),
      recurrenceWeekday: weekday,
      recurrenceTime: time,
      durationMinutes: duration,
      capacity,
      createdBy: user.id,
    });
    window.alert(
      result.success ? text("Créneau créé.", "Slot created.") : result.error,
    );
  }

  function reviewConductAndPublish(bookingId: string, rating: ExamConductRating, reviewerId: string, note: string) {
    const result = reviewConduct(bookingId, rating, reviewerId, note);
    if (!result.success) return result;
    const booking = data.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.attemptScorePercent === undefined || !booking.attemptId) return result;
    const approved = rating === "good" || rating === "passable";
    const studioCourse = publishedStudioCourses.find((item) => item.slug === booking.courseSlug);
    const weightedGrade = studioCourse?.finalExam ? calculateFinalGrade({ courseSlug: booking.courseSlug, quizSlugs: studioCourse.quizzes.map((quiz) => quiz.slug), quizAttempts: loadQuizAttempts(booking.userId), examSlug: studioCourse.finalExam.definition.slug, examAttempts: loadExamAttempts(booking.userId), exercisesCount: studioCourse.applicationExercises?.length ?? 0, submissions: loadExerciseSubmissions().filter((item) => item.studentUserId === booking.userId) }) : null;
    const finalScore = weightedGrade?.finalScore ?? booking.attemptScorePercent;
    const certified = approved && finalScore >= 70;
    const course = getLocalCourseBySlug(booking.courseSlug) ?? (studioCourse ? studioCourseToAcademyCourse(studioCourse) : undefined);
    if (certified && course) saveCertificate(createCertificateRecord({ user: { id: booking.userId, fullName: booking.candidateName, email: booking.candidateEmail }, course, finalScore }));
    const failureMessage = !approved ? `Le deroulement de votre test n'a pas ete valide par le surveillant. ${note || "Consultez votre espace pour les details."}` : `Votre note finale ponderee est de ${finalScore} %, sous le seuil de certification de 70 %.`;
    pushNotificationForUser(booking.userId, { id: `certification-decision-${booking.attemptId}`, type: certified ? "certificate" : "exam", priority: "high", source: "manual", title: certified ? "Felicitations, votre certificat est disponible !" : "Decision de certification disponible", titleEn: certified ? "Congratulations, your certificate is available!" : "Certification decision available", message: certified ? `Felicitations ! Votre note finale est de ${finalScore} %. Votre certificat est disponible dans votre espace.` : failureMessage, messageEn: certified ? `Congratulations! Your final grade is ${finalScore}%. Your certificate is available in your account.` : `No certificate was issued. Your final grade is ${finalScore}%. See your account for details.`, href: certified ? "/dashboard/certificates" : "/dashboard/exams", createdAt: new Date().toISOString() });
    void fetch("/api/certificates/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateEmail: booking.candidateEmail, courseSlug: booking.courseSlug, finalScore, conductRating: rating, attemptId: booking.attemptId, failureMessage }) })
      .then(async (response) => ({ response, payload: await response.json() as { certified?: boolean; certificateNumber?: string; emailStatus?: string; error?: string } }))
      .then(({ response, payload }) => window.alert(response.ok ? payload.certified ? text(`Certificat public ${payload.certificateNumber} publie et message envoye (${payload.emailStatus}).`, `Public certificate ${payload.certificateNumber} published and message sent (${payload.emailStatus}).`) : text(`Decision d'echec enregistree et message envoye (${payload.emailStatus}).`, `Failure decision saved and message sent (${payload.emailStatus}).`) : text(`Decision locale enregistree, mais synchronisation serveur impossible : ${payload.error ?? "erreur"}`, `Local decision saved, but server synchronization failed: ${payload.error ?? "error"}`)));
    return result;
  }
  return (
    <div className="space-y-8">
      <ProctoringAiReadiness />
      <IntegrityReview
        data={data}
        userId={user?.id}
        reviewConduct={reviewConductAndPublish}
      />
      <section className="rounded-[28px] border border-green-100 bg-white p-7">
        <h2 className="text-2xl font-extrabold text-[#063D2E]">
          {text("Créer un créneau certifiant", "Create a certification slot")}
        </h2>
        <form onSubmit={submitSlot} className="mt-5 grid gap-4 lg:grid-cols-6">
          <label className="text-sm font-bold text-[#063D2E]">
            {text("Examen", "Exam")}
            <select
              value={examSlug}
              onChange={(event) => setExamSlug(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border bg-white px-3"
            >
              {exams.map((exam) => (
                <option key={exam.slug} value={exam.slug}>
                  {exam.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[#063D2E]">{text("Jour hebdomadaire", "Weekly day")}<select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border bg-white px-3"><option value={1}>Lundi / Monday</option><option value={2}>Mardi / Tuesday</option><option value={3}>Mercredi / Wednesday</option><option value={4}>Jeudi / Thursday</option><option value={5}>Vendredi / Friday</option><option value={6}>Samedi / Saturday</option><option value={0}>Dimanche / Sunday</option></select></label>
          <label className="text-sm font-bold text-[#063D2E]">{text("Heure recurrente", "Recurring time")}<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-bold text-[#063D2E]">
            {text("Durée (min)", "Duration (min)")}
            <input
              type="number"
              min={15}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-sm font-bold text-[#063D2E]">
            {text("Places (max 10)", "Seats (max 10)")}
            <input
              type="number"
              min={1}
              max={10}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-xl border px-3"
            />
          </label>
          <button className="mt-auto h-12 rounded-full bg-[#0B5D3B] px-5 font-bold text-white">
            {text("Publier le créneau", "Publish slot")}
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-green-100 bg-white p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#063D2E]">
              {text("Demandes à valider", "Requests to review")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {text(
                "L’approbation génère un code de salle unique.",
                "Approval generates a unique room code.",
              )}
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
            {data.bookings.filter((item) => item.status === "pending").length}{" "}
            {text("en attente", "pending")}
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {data.bookings
            .filter((item) => item.status === "pending")
            .map((booking) => {
              const bookingSlot = data.slots.find(
                (item) => item.id === booking.slotId,
              );
              return (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                >
                  <div>
                    <p className="font-bold text-[#063D2E]">
                      {booking.candidateName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {booking.candidateEmail} ·{" "}
                      {bookingSlot
                        ? new Date(bookingSlot.startsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")
                        : text("Créneau absent", "Slot missing")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        user && reviewBooking(booking.id, false, user.id)
                      }
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
                    >
                      {text("Refuser", "Reject")}
                    </button>
                    <button
                      onClick={() =>
                        user && reviewBooking(booking.id, true, user.id)
                      }
                      className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-bold text-white"
                    >
                      {text("Approuver", "Approve")}
                    </button>
                  </div>
                </div>
              );
            })}
          {data.bookings.every((item) => item.status !== "pending") && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              {text("Aucune demande en attente.", "No pending requests.")}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-green-100 bg-white p-7">
        <h2 className="text-2xl font-extrabold text-[#063D2E]">
          {text("Contrôle d’identité", "Identity verification")}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {text(
            "Le score local est saisi après contrôle humain. En production, il sera fourni par le prestataire KYC et restera révisable.",
            "The local score is entered after human review. In production, it will be supplied by the KYC provider and remain reviewable.",
          )}
        </p>
        <div className="mt-5 space-y-4">
          {data.bookings
            .filter((booking) => booking.identity?.status === "pending_review")
            .map((booking) => (
              <div
                key={booking.id}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-[#063D2E]">
                      {booking.candidateName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {booking.identity?.documentType} ·{" "}
                      {booking.identity?.issuingCountry} · {text("expire le", "expires on")}{" "}
                      {booking.identity?.expiresAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800">
                    {text("Seuil", "Threshold")} {data.policy.identityThreshold}%
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label className="text-sm font-bold">
                    Score
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scores[booking.id] ?? 0}
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [booking.id]: Number(event.target.value),
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={matches[booking.id] ?? false}
                      onChange={(event) =>
                        setMatches((current) => ({
                          ...current,
                          [booking.id]: event.target.checked,
                        }))
                      }
                    />{" "}
                    {text("Profil concordant", "Profile matches")}
                  </label>
                  <label className="text-sm font-bold md:col-span-2">
                    Note
                    <input
                      value={notes[booking.id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [booking.id]: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      user &&
                      reviewIdentity(booking.id, {
                        approved: false,
                        matchScore: scores[booking.id] ?? 0,
                        profileDataMatched: matches[booking.id] ?? false,
                        reviewerId: user.id,
                        note:
                          notes[booking.id] ??
                          text("Contrôle refusé", "Verification rejected"),
                      })
                    }
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
                  >
                    {text("Refuser", "Reject")}
                  </button>
                  <button
                    onClick={() =>
                      user &&
                      window.alert(
                        reviewIdentity(booking.id, {
                          approved: true,
                          matchScore: scores[booking.id] ?? 0,
                          profileDataMatched: matches[booking.id] ?? false,
                          reviewerId: user.id,
                          note:
                            notes[booking.id] ??
                            text("Identité contrôlée", "Identity reviewed"),
                        }).error ?? text("Identité validée.", "Identity verified."),
                      )
                    }
                    className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-bold text-white"
                  >
                    {text("Valider", "Approve")}
                  </button>
                </div>
              </div>
            ))}
          {data.bookings.every(
            (item) => item.identity?.status !== "pending_review",
          ) && (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              {text("Aucun dossier à vérifier.", "No file to review.")}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-green-100 bg-white p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-[#063D2E]">
              {text("Cockpit examinateur", "Examiner cockpit")}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {text(
                "Jusqu’à 10 candidats par salle, avec état caméra, écran et incidents.",
                "Up to 10 candidates per room, with camera, screen and incident status.",
              )}
            </p>
          </div>
          <select
            value={activeSlotId}
            onChange={(event) => setSelectedSlot(event.target.value)}
            className="h-12 min-w-72 rounded-xl border bg-white px-3"
          >
            <option value="">{text("Sélectionner une salle", "Select a room")}</option>
            {data.slots.map((item) => (
              <option key={item.id} value={item.id}>
                {new Date(item.startsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")} ·{" "}
                {item.examSlug}
              </option>
            ))}
          </select>
        </div>
        {slot && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#F8FAFC] p-4">
            <Clock3 size={18} />
            <strong>{data.roomStatuses[slot.id] ?? "scheduled"}</strong>
            <button
              onClick={() => {
                const result = setRoomStatus(slot.id, "active");
                if (!result.success) window.alert(result.error);
              }}
              className="ml-auto rounded-full bg-[#F58220] px-5 py-2 text-sm font-bold text-white"
            >
              {text("Activer l’examen", "Activate exam")}
            </button>
            <button
              onClick={() => setRoomStatus(slot.id, "closed")}
              className="rounded-full border px-5 py-2 text-sm font-bold"
            >
              {text("Clôturer", "Close")}
            </button>
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => {
            const admission = data.admissions.find(
              (item) => item.bookingId === candidate.id,
            );
            const candidateIncidents = data.incidents.filter(
              (item) => item.bookingId === candidate.id,
            );
            return (
              <article
                key={candidate.id}
                className="overflow-hidden rounded-2xl border border-slate-200"
              >
                <div className="grid aspect-video grid-cols-2 bg-[#063D2E] text-white">
                  <div className="flex flex-col items-center justify-center border-r border-white/20">
                    <MonitorUp />
                    <span className="mt-2 text-xs">{text("Écran partagé", "Shared screen")}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <Camera />
                    <span className="mt-2 text-xs">{text("Visage candidat", "Candidate face")}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-[#063D2E]">
                        {candidate.candidateName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {candidate.roomCode}
                      </p>
                    </div>
                    {admission?.admittedAt && !admission.ejectedAt ? (
                      <CheckCircle2 className="text-green-600" />
                    ) : (
                      <ShieldAlert className="text-amber-600" />
                    )}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {candidateIncidents.length} incident(s) ·{" "}
                    {admission?.ejectedAt
                      ? text("Éjecté / verrouillé", "Ejected / locked")
                      : admission?.admittedAt
                        ? text("En composition", "Taking exam")
                        : text("En attente", "Waiting")}
                  </p>
                  <p
                    className={`mt-2 text-xs font-bold ${admission?.riskLevel === "high" ? "text-red-700" : admission?.riskLevel === "medium" ? "text-amber-700" : "text-green-700"}`}
                  >
                    {text("Risque IA", "AI risk")}: {admission?.riskScore ?? 0}/100 ·{" "}
                    {admission?.riskLevel ?? "low"}
                    {admission?.reviewRequiredAt
                      ? text(" · revue requise", " · review required")
                      : ""}
                  </p>
                  {admission?.admittedAt && !admission.ejectedAt && (
                    <button
                      onClick={() =>
                        ejectCandidate(
                          candidate.id,
                          text(
                            "Décision manuelle de l’examinateur",
                            "Manual examiner decision",
                          ),
                        )
                      }
                      className="mt-3 text-xs font-bold text-red-700"
                    >
                      {text("Verrouiller le candidat", "Lock candidate")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {candidates.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-slate-500">
            <Users className="mx-auto mb-3" />
            {text(
              "Aucun candidat approuvé dans cette salle.",
              "No approved candidates in this room.",
            )}
          </div>
        )}
        {incidents.length > 0 && (
          <div className="mt-7">
            <h3 className="font-extrabold text-[#063D2E]">
              {text("Journal d’incidents", "Incident log")}
            </h3>
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`rounded-xl p-3 text-sm ${incident.severity === "critical" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}
                >
                  <strong>{incident.type}</strong> · {incident.message} ·{" "}
                  {new Date(incident.occurredAt).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US")}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


function IntegrityReview({
  data,
  userId,
  reviewConduct,
}: {
  data: ReturnType<typeof useProctoring>["data"];
  userId?: string;
  reviewConduct: (
    bookingId: string,
    rating: ExamConductRating,
    reviewerId: string,
    note: string,
  ) => { success: boolean; error?: string };
}) {
  const { text } = useLanguage();
  const bookings = data.bookings.filter(
    (booking) =>
      booking.status === "approved" &&
      booking.identity?.status === "verified" &&
      Boolean(booking.attemptId),
  );
  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-7">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        {text("Décision finale d’intégrité", "Final integrity decision")}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {text(
          "Le certificat reste bloqué jusqu’à cette décision, même si la note académique est suffisante.",
          "The certificate remains blocked until this decision, even when the academic score is sufficient.",
        )}
      </p>
      <div className="mt-5 space-y-3">
        {bookings.map((booking) => {
          const admission = data.admissions.find(
            (item) => item.bookingId === booking.id,
          );
          return (
            <div
              key={booking.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
            >
              <div>
                <p className="font-extrabold text-[#063D2E]">
                  {booking.candidateName}
                </p>
                <p className="text-sm text-slate-500">
                  {text("Score", "Score")}: {booking.attemptScorePercent ?? text("non soumis", "not submitted")}% · {text("Tentative", "Attempt")} {booking.attemptNumber}/3 · {text("Incidents", "Incidents")}: {" "}
                  {
                    data.incidents.filter(
                      (item) => item.bookingId === booking.id,
                    ).length
                  }{" "}
                  · {text("Déroulement", "Conduct")}: {booking.conductRating ?? "pending"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!userId || booking.conductRating !== undefined}
                  onClick={() =>
                    userId &&
                    reviewConduct(
                      booking.id,
                      "poor",
                      userId,
                      text(
                        "Conditions insuffisantes : nouvelle tentative obligatoire",
                        "Insufficient conditions: a new attempt is required",
                      ),
                    )
                  }
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-40"
                >
                  Poor
                </button>
                <button
                  disabled={
                    !booking.attemptPassed || Boolean(admission?.ejectedAt) || !userId || booking.conductRating !== undefined
                  }
                  onClick={() =>
                    userId &&
                    reviewConduct(
                      booking.id,
                      "passable",
                      userId,
                      text(
                        "Conditions passables après revue humaine",
                        "Acceptable conditions after human review",
                      ),
                    )
                  }
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                >
                  {text("Passable", "Passable")}
                </button>
                <button
                  disabled={
                    !booking.attemptPassed || Boolean(admission?.ejectedAt) || !userId || booking.conductRating !== undefined
                  }
                  onClick={() =>
                    userId &&
                    reviewConduct(
                      booking.id,
                      "good",
                      userId,
                      text(
                        "Bon déroulement certifié après revue humaine",
                        "Good conduct certified after human review",
                      ),
                    )
                  }
                  className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                >
                  {text("Bon", "Good")}
                </button>
              </div>
            </div>
          );
        })}
        {bookings.length === 0 && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            {text(
              "Aucune session prête pour la décision finale.",
              "No session is ready for the final decision.",
            )}
          </p>
        )}
      </div>
    </section>
  );
}