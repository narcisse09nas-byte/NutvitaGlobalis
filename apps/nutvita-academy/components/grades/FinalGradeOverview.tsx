"use client";

import { useMemo } from "react";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { loadExerciseSubmissions } from "@/lib/application-exercise-storage";
import { loadExamAttempts } from "@/lib/exam-storage";
import { calculateFinalGrade } from "@/lib/final-grade-engine";
import { getLocalUsers } from "@/lib/local-auth";
import { loadQuizAttempts } from "@/lib/quiz-storage";

export function FinalGradeOverview({ learnerOnly = false }: { learnerOnly?: boolean }) {
  const { user } = useLocalAuth();
  const { data } = useInstructorStudio();
  const rows = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.role === "admin" || user.role === "super_admin";
    const courses = data.courses.filter((course) =>
      learnerOnly ? course.status === "published" : isAdmin || course.instructorUserId === user.id,
    );
    const learners = learnerOnly ? [user] : getLocalUsers().filter((candidate) => candidate.role === "student");
    const submissions = loadExerciseSubmissions();
    return courses.flatMap((course) => learners.map((learner) => ({
      course,
      learner,
      grade: calculateFinalGrade({
        courseSlug: course.slug,
        quizSlugs: course.quizzes.map((quiz) => quiz.slug),
        quizAttempts: loadQuizAttempts(learner.id),
        examSlug: course.finalExam?.definition.slug ?? "",
        examAttempts: loadExamAttempts(learner.id),
        exercisesCount: course.applicationExercises?.length ?? 0,
        submissions: submissions.filter((item) => item.studentUserId === learner.id),
      }),
    })));
  }, [data.courses, learnerOnly, user]);

  return (
    <section className="rounded-[28px] border border-green-100 bg-white p-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">Synthese des notes finales</h2>
      <p className="mt-2 text-sm text-slate-600">Quiz 25 % + exercice 15 % + examen 60 %. Sans exercice : quiz 40 % + examen 60 %.</p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="p-3">Apprenant</th><th className="p-3">Formation</th><th className="p-3">Quiz</th><th className="p-3">Exercice</th><th className="p-3">Examen</th><th className="p-3">Finale</th><th className="p-3">Decision</th></tr></thead>
          <tbody>{rows.map(({ course, learner, grade }) => (
            <tr key={`${course.id}:${learner.id}`} className="border-b last:border-0">
              <td className="p-3 font-bold">{learner.fullName}</td><td className="p-3">{course.title}</td><td className="p-3">{grade.quizScore}%</td><td className="p-3">{grade.exerciseScore === null ? "Non prevu" : `${grade.exerciseScore}%`}</td><td className="p-3">{grade.examScore}%</td><td className="p-3 text-lg font-extrabold text-[#063D2E]">{grade.finalScore}%</td><td className="p-3">{grade.passed ? "Certifiable" : "Seuil 70 % non atteint"}</td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-slate-500">Aucune note disponible.</p>}
      </div>
    </section>
  );
}
