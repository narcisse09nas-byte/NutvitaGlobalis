"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { getLocalUsers } from "@/lib/local-auth";
import { loadQuizAttempts } from "@/lib/quiz-storage";
import { loadExamAttempts } from "@/lib/exam-storage";
import { loadManualGrades, saveManualGrades } from "@/lib/gradebook-storage";
import type { ManualGrade } from "@/types/gradebook";
import { useLanguage } from "@/hooks/use-language";

export function InstructorGradebook() {
  const { text } = useLanguage();
  const { user } = useLocalAuth();
  const { data } = useInstructorStudio();
  const [grades, setGrades] = useState<ManualGrade[]>([]);
  const [studentId, setStudentId] = useState(""); const [courseSlug, setCourseSlug] = useState(""); const [activityTitle, setActivityTitle] = useState(""); const [score, setScore] = useState(0); const [feedback, setFeedback] = useState("");
  useEffect(() => { setGrades(loadManualGrades()); }, []);
  const [students, setStudents] = useState(() => getLocalUsers().filter((item) => item.role === "student"));
  useEffect(() => { setStudents(getLocalUsers().filter((item) => item.role === "student")); }, []);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const courses = data.courses.filter((course) => isAdmin || course.instructorUserId === user?.id);
  const courseSlugs = new Set(courses.map((course) => course.slug));
  const automaticRows = useMemo(() => students.flatMap((student) => [
    ...loadQuizAttempts(student.id).filter((attempt) => isAdmin || courses.some((course) => course.quizzes.some((quiz) => quiz.slug === attempt.quizSlug))).map((attempt) => ({ id: attempt.id, student, assessment: attempt.quizSlug, type: "Quiz", score: attempt.scorePercent, passed: attempt.passed })),
    ...loadExamAttempts(student.id).filter((attempt) => isAdmin || courses.some((course) => course.finalExam?.definition.slug === attempt.examSlug)).map((attempt) => ({ id: attempt.id, student, assessment: attempt.examSlug, type: "Examen", score: attempt.scorePercent, passed: attempt.passed })),
  ]), [courses, isAdmin, students]);
  const visibleManual = grades.filter((grade) => isAdmin || courseSlugs.has(grade.courseSlug));
  function submit(event: FormEvent) { event.preventDefault(); if (!user || !studentId || !courseSlug || !activityTitle.trim()) return; const grade: ManualGrade = { id: crypto.randomUUID?.() ?? `${Date.now()}`, studentUserId: studentId, courseSlug, activityTitle: activityTitle.trim(), scorePercent: Math.max(0, Math.min(100, score)), feedback: feedback.trim(), graderUserId: user.id, createdAt: new Date().toISOString() }; const updated = [grade, ...grades]; setGrades(updated); saveManualGrades(updated); setActivityTitle(""); setFeedback(""); setScore(0); }
  return <div className="space-y-7">
    <form onSubmit={submit} className="rounded-[24px] border border-green-100 bg-white p-6"><div className="flex items-center gap-3"><ClipboardCheck className="text-[#0B5D3B]" /><h2 className="text-xl font-extrabold text-[#063D2E]">{text("Ajouter une note ou une appréciation", "Add a grade or feedback")}</h2></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-12 rounded-xl border bg-white px-3"><option value="">{text("Apprenant", "Learner")}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select><select required value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} className="h-12 rounded-xl border bg-white px-3"><option value="">{text("Formation", "Course")}</option>{courses.map((course) => <option key={course.id} value={course.slug}>{course.title}</option>)}</select><input required value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder={text("Travail ou activité", "Assignment or activity")} className="h-12 rounded-xl border px-3" /><input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="h-12 rounded-xl border px-3" /><button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F58220] px-5 font-bold text-white"><Plus size={17} /> {text("Enregistrer", "Save")}</button><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={text("Appréciation du formateur", "Instructor feedback")} rows={3} className="rounded-xl border px-3 py-3 md:col-span-2 xl:col-span-5" /></div></form>
    <section className="overflow-x-auto rounded-[24px] border border-green-100 bg-white"><h2 className="p-6 text-xl font-extrabold text-[#063D2E]">{text("Résultats automatiques", "Automatic results")}</h2><table className="min-w-full text-sm"><thead className="bg-[#063D2E] text-left text-white"><tr><th className="px-5 py-3">{text("Apprenant", "Learner")}</th><th className="px-5 py-3">{text("Évaluation", "Assessment")}</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">{text("Résultat", "Result")}</th></tr></thead><tbody>{automaticRows.map((row) => <tr key={row.id} className="border-t"><td className="px-5 py-3 font-bold">{row.student.fullName}</td><td className="px-5 py-3">{row.assessment}</td><td className="px-5 py-3">{row.type}</td><td className="px-5 py-3">{row.score}%</td><td className={`px-5 py-3 font-bold ${row.passed ? "text-green-700" : "text-red-600"}`}>{row.passed ? text("Réussi", "Passed") : text("Échoué", "Failed")}</td></tr>)}{automaticRows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">{text("Aucun résultat enregistré.", "No result recorded.")}</td></tr>}</tbody></table></section>
    <section className="overflow-x-auto rounded-[24px] border border-green-100 bg-white"><h2 className="p-6 text-xl font-extrabold text-[#063D2E]">{text("Notes manuelles", "Manual grades")}</h2><table className="min-w-full text-sm"><thead className="bg-[#063D2E] text-left text-white"><tr><th className="px-5 py-3">{text("Apprenant", "Learner")}</th><th className="px-5 py-3">{text("Formation", "Course")}</th><th className="px-5 py-3">{text("Activité", "Activity")}</th><th className="px-5 py-3">{text("Note", "Grade")}</th><th className="px-5 py-3">{text("Appréciation", "Feedback")}</th></tr></thead><tbody>{visibleManual.map((grade) => <tr key={grade.id} className="border-t"><td className="px-5 py-3 font-bold">{students.find((item) => item.id === grade.studentUserId)?.fullName ?? text("Apprenant", "Learner")}</td><td className="px-5 py-3">{grade.courseSlug}</td><td className="px-5 py-3">{grade.activityTitle}</td><td className="px-5 py-3 font-bold">{grade.scorePercent}/100</td><td className="px-5 py-3">{grade.feedback || "—"}</td></tr>)}{visibleManual.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">{text("Aucune note manuelle.", "No manual grade.")}</td></tr>}</tbody></table></section>
  </div>;
}
