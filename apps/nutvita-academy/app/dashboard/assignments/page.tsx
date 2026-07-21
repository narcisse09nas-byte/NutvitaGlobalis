"use client";
import { FormEvent, useEffect, useState } from "react";
import { FileUp } from "lucide-react";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useLocalAuth } from "@/hooks/use-local-auth";
import {
  loadExerciseSubmissions,
  saveExerciseSubmissions,
} from "@/lib/application-exercise-storage";
import { saveLocalMedia } from "@/lib/local-media-storage";
import {
  extractDocumentText,
  EXERCISE_DOCUMENT_FORMATS,
} from "@/lib/document-text-import";
import { getPublishedStudioCourses } from "@/lib/studio-course-runtime";
import { LocalMediaLink } from "@/components/player/LocalMediaLink";
import type { ExerciseSubmission } from "@/types/application-exercise";

type AiGrade = {
  scorePercent: number;
  feedbackFr: string;
  feedbackEn: string;
  strengths: string[];
  improvements: string[];
  model: string;
};
export default function AssignmentsPage() {
  const { data } = useInstructorStudio(),
    { user } = useLocalAuth(),
    [items, setItems] = useState<ExerciseSubmission[]>([]),
    [submittingId, setSubmittingId] = useState<string | null>(null);
  useEffect(() => setItems(loadExerciseSubmissions()), []);
  if (!user?.id) return null;
  const userId = user.id,
    courses = getPublishedStudioCourses(data);
  async function submit(
    event: FormEvent<HTMLFormElement>,
    exerciseId: string,
    courseSlug: string,
    max: number | null,
  ) {
    event.preventDefault();
    const previous = items.filter(
      (item) => item.exerciseId === exerciseId && item.studentUserId === userId,
    );
    if (max !== null && previous.length >= max) return;
    setSubmittingId(exerciseId);
    const form = event.currentTarget;
    try {
      const fd = new FormData(form),
        responseText = String(fd.get("response") ?? ""),
        file = fd.get("attachment"),
        attachment = file instanceof File && file.size > 0 ? file : null;
      let attachmentUrl: string | undefined,
        attachmentText = "";
      if (attachment) {
        [attachmentUrl, attachmentText] = await Promise.all([
          saveLocalMedia(attachment),
          extractDocumentText(attachment),
        ]);
      }
      let grade: AiGrade | undefined, aiGradingError: string | undefined;
      try {
        const result = await fetch("/api/ai/grade-assignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseSlug,
            exerciseId,
            candidateAnswer: [responseText, attachmentText]
              .filter(Boolean)
              .join("\n\n"),
          }),
        });
        const payload = await result.json();
        if (!result.ok) throw new Error(payload.error ?? "AI_GRADING_FAILED");
        grade = payload as AiGrade;
      } catch (error) {
        aiGradingError =
          error instanceof Error ? error.message : "AI_GRADING_FAILED";
      }
      const entry: ExerciseSubmission = {
        id: crypto.randomUUID(),
        exerciseId,
        courseSlug,
        studentUserId: userId,
        responseText,
        attachmentUrl,
        attachmentName: attachment?.name,
        submittedAt: new Date().toISOString(),
        attemptNumber: previous.length + 1,
        scorePercent: grade?.scorePercent,
        aiScorePercent: grade?.scorePercent,
        aiFeedbackFr: grade?.feedbackFr,
        aiFeedbackEn: grade?.feedbackEn,
        aiStrengths: grade?.strengths,
        aiImprovements: grade?.improvements,
        aiModel: grade?.model,
        aiGradedAt: grade ? new Date().toISOString() : undefined,
        aiGradingError,
        gradeSource: grade ? "ai" : undefined,
      };
      const next = [entry, ...items];
      setItems(next);
      saveExerciseSubmissions(next);
      form.reset();
    } finally {
      setSubmittingId(null);
    }
  }
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-4xl font-extrabold text-[#063D2E]">
        Exercices d&apos;application
      </h1>
      <div className="mt-8 space-y-6">
        {courses
          .flatMap((course) =>
            (course.applicationExercises ?? []).map((exercise) => ({
              course,
              exercise,
            })),
          )
          .map(({ course, exercise }) => {
            const own = items.filter(
                (submission) =>
                  submission.exerciseId === exercise.id &&
                  submission.studentUserId === userId,
              ),
              blocked =
                exercise.maxAttempts !== null &&
                own.length >= exercise.maxAttempts,
              modules = (exercise.moduleIds ?? [])
                .map(
                  (id) =>
                    course.modules.find((module) => module.id === id)?.title,
                )
                .filter(Boolean)
                .join(", ");
            return (
              <section
                key={exercise.id}
                className="rounded-3xl border bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{exercise.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#0B5D3B]">
                      Modules : {modules}
                    </p>
                  </div>
                  {exercise.requiredBeforeProgress && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Obligatoire pour poursuivre
                    </span>
                  )}
                </div>
                <p className="mt-3 text-slate-600">{exercise.instructions}</p>
                <div className="mt-3 flex gap-4">
                  {(exercise.caseUrlFr || exercise.resourceUrl) && (
                    <LocalMediaLink
                      href={exercise.caseUrlFr || exercise.resourceUrl!}
                      className="font-bold text-green-700"
                    >
                      Ouvrir le cas FR
                    </LocalMediaLink>
                  )}
                  {exercise.caseUrlEn && (
                    <LocalMediaLink
                      href={exercise.caseUrlEn}
                      className="font-bold text-green-700"
                    >
                      Open EN case
                    </LocalMediaLink>
                  )}
                </div>
                <form
                  onSubmit={(event) =>
                    void submit(
                      event,
                      exercise.id,
                      course.slug,
                      exercise.maxAttempts,
                    )
                  }
                  className="mt-5 grid gap-3"
                >
                  <textarea
                    name="response"
                    required
                    rows={7}
                    className="rounded-xl border p-3"
                    placeholder="Votre rÃ©ponse dÃ©taillÃ©e"
                  />
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-3 text-sm font-bold text-[#0B5D3E]">
                    <FileUp size={17} />
                    Joindre votre travail (facultatif)
                    <input
                      name="attachment"
                      type="file"
                      accept={EXERCISE_DOCUMENT_FORMATS}
                      className="sr-only"
                    />
                  </label>
                  <button
                    disabled={blocked || submittingId === exercise.id}
                    className="justify-self-start rounded-full bg-[#F58220] px-5 py-3 font-bold text-white disabled:bg-slate-300"
                  >
                    {submittingId === exercise.id
                      ? "Correction IA en coursâ€¦"
                      : `Soumettre - tentative ${own.length + 1}${exercise.maxAttempts ? `/${exercise.maxAttempts}` : "/illimitÃ©e"}`}
                  </button>
                </form>
                {own.map((submission) => (
                  <div
                    key={submission.id}
                    className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"
                  >
                    <b>Tentative {submission.attemptNumber}</b>
                    {submission.scorePercent !== undefined ? (
                      <>
                        <p className="mt-2 text-lg font-extrabold text-[#063D2E]">
                          Note : {submission.scorePercent}/100{" "}
                          {submission.gradeSource === "instructor_override"
                            ? "(modifiÃ©e par le formateur)"
                            : "(IA)"}
                        </p>
                        <p className="mt-1">
                          {submission.gradeSource === "instructor_override"
                            ? submission.feedback
                            : submission.aiFeedbackFr}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-amber-700">
                        Correction IA indisponible :{" "}
                        {submission.aiGradingError ?? "en attente"}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
      </div>
    </div>
  );
}
