"use client";

import { useEffect, useState } from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { getLocalUsers } from "@/lib/local-auth";
import {
  loadExerciseSubmissions,
  saveExerciseSubmissions,
} from "@/lib/application-exercise-storage";
import { LocalMediaLink } from "@/components/player/LocalMediaLink";
import type { ExerciseSubmission } from "@/types/application-exercise";

export function ExerciseSubmissionGrader() {
  const { user } = useLocalAuth();
  const { data } = useInstructorStudio();
  const [items, setItems] = useState<ExerciseSubmission[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  useEffect(() => setItems(loadExerciseSubmissions()), []);
  const admin = user?.role === "admin" || user?.role === "super_admin";
  const courses = data.courses.filter(
    (course) => admin || course.instructorUserId === user?.id,
  );
  const allowed = new Set(courses.map((course) => course.slug));
  const students = getLocalUsers();
  function grade(item: ExerciseSubmission) {
    if (!user) return;
    const next = items.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            scorePercent: Math.max(
              0,
              Math.min(100, scores[entry.id] ?? entry.scorePercent ?? 0),
            ),
            feedback: feedback[entry.id] ?? entry.feedback ?? "",
            gradeSource: "instructor_override" as const,
            instructorOriginalAiScore: entry.aiScorePercent,
            gradedBy: user.id,
            gradedAt: new Date().toISOString(),
          }
        : entry,
    );
    setItems(next);
    saveExerciseSubmissions(next);
  }
  return (
    <section className="rounded-3xl border bg-white p-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        Exercices soumis
      </h2>
      <div className="mt-5 space-y-4">
        {items
          .filter((item) => allowed.has(item.courseSlug))
          .map((item) => {
            const course = courses.find(
              (entry) => entry.slug === item.courseSlug,
            );
            const exercise = course?.applicationExercises?.find(
              (entry) => entry.id === item.exerciseId,
            );
            return (
              <article key={item.id} className="rounded-2xl bg-slate-50 p-5">
                <b>
                  {students.find((student) => student.id === item.studentUserId)
                    ?.fullName ?? "Apprenant"}{" "}
                  â€” {course?.title ?? item.courseSlug}
                </b>
                <p className="mt-1 text-sm font-semibold text-[#0B5D3B]">
                  {exercise?.title ?? "Exercice dâ€™application"} Â· tentative{" "}
                  {item.attemptNumber}
                </p>
                <div className="mt-3 rounded-xl bg-white p-3 text-sm">
                  <b>
                    Correction IA :{" "}
                    {item.aiScorePercent !== undefined
                      ? `${item.aiScorePercent}/100`
                      : "indisponible"}
                  </b>
                  {item.aiFeedbackFr && (
                    <p className="mt-1 text-slate-600">{item.aiFeedbackFr}</p>
                  )}
                  {item.gradeSource === "instructor_override" && (
                    <p className="mt-1 font-bold text-[#F58220]">
                      Note remplacÃ©e par le formateur : {item.scorePercent}/100
                    </p>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {item.responseText}
                </p>
                {item.attachmentUrl && (
                  <LocalMediaLink
                    href={item.attachmentUrl}
                    className="mt-2 inline-flex font-bold text-green-700"
                  >
                    Ouvrir {item.attachmentName || "la piÃ¨ce jointe"}
                  </LocalMediaLink>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_auto]">
                  <input
                    aria-label="Note sur 100"
                    type="number"
                    min={0}
                    max={100}
                    value={scores[item.id] ?? item.scorePercent ?? 0}
                    onChange={(event) =>
                      setScores({
                        ...scores,
                        [item.id]: Number(event.target.value),
                      })
                    }
                    className="h-11 rounded-xl border px-3"
                  />
                  <input
                    value={feedback[item.id] ?? item.feedback ?? ""}
                    onChange={(event) =>
                      setFeedback({
                        ...feedback,
                        [item.id]: event.target.value,
                      })
                    }
                    placeholder="ApprÃ©ciation"
                    className="h-11 rounded-xl border px-3"
                  />
                  <button
                    type="button"
                    onClick={() => grade(item)}
                    className="rounded-full bg-[#0B5D3B] px-5 font-bold text-white"
                  >
                    Corriger et noter
                  </button>
                </div>
              </article>
            );
          })}
        {!items.some((item) => allowed.has(item.courseSlug)) && (
          <p className="text-slate-500">Aucun exercice soumis.</p>
        )}
      </div>
    </section>
  );
}
