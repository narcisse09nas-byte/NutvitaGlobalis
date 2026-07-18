"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

type CourseSummary = { id: string; title: string; enrolledCount: number; graduatedCount: number };
type Learner = { userId: string; courseId: string; courseTitle: string; fullName: string; email: string; progressPercent: number; graduated: boolean; enrolledAt: string; lastActivityAt: string | null; certificateIssuedAt: string | null; finalScore: number | null };

export function InstructorLearnerOverview() {
  const { locale } = useLanguage();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/studio/analytics", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Chargement impossible");
      setCourses(payload.courses ?? []); setLearners(payload.learners ?? []);
    }).catch((reason: Error) => setError(reason.message));
  }, []);
  const visible = useMemo(() => selectedCourse === "all" ? learners : learners.filter((item) => item.courseId === selectedCourse), [learners, selectedCourse]);
  const graduated = visible.filter((item) => item.graduated).length;
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      {[[BookOpen, courses.length, locale === "fr" ? "Formations attribuees" : "Assigned courses"], [Users, visible.length, locale === "fr" ? "Apprenants inscrits" : "Enrolled learners"], [Award, graduated, locale === "fr" ? "Diplomes" : "Graduates"]].map(([Icon, value, label]) => {
        const SummaryIcon = Icon as typeof BookOpen;
        return <div key={String(label)} className="rounded-[22px] border border-green-100 bg-white p-5"><SummaryIcon className="text-[#0B5D3B]"/><p className="mt-3 text-3xl font-extrabold text-[#063D2E]">{String(value)}</p><p className="text-sm text-slate-500">{String(label)}</p></div>;
      })}
    </div>
    <div className="rounded-[24px] border border-green-100 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-[#063D2E]">{locale === "fr" ? "Progression par apprenant" : "Learner progress"}</h2>
        <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-4">
          <option value="all">{locale === "fr" ? "Toutes mes formations" : "All my courses"}</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
      </div>
      {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b text-slate-500"><tr><th className="p-3">{locale === "fr" ? "Apprenant" : "Learner"}</th><th className="p-3">{locale === "fr" ? "Formation" : "Course"}</th><th className="p-3">Progression</th><th className="p-3">Statut</th><th className="p-3">{locale === "fr" ? "Derniere activite" : "Last activity"}</th></tr></thead>
        <tbody>{visible.map((item) => <tr key={`${item.courseId}-${item.userId}`} className="border-b border-slate-100"><td className="p-3"><strong className="block text-[#063D2E]">{item.fullName}</strong><span className="text-slate-500">{item.email}</span></td><td className="p-3">{item.courseTitle}</td><td className="p-3"><div className="h-2 w-28 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#0B5D3B]" style={{width:`${item.progressPercent}%`}}/></div><span>{item.progressPercent}%</span></td><td className="p-3"><span className={`rounded-full px-3 py-1 font-bold ${item.graduated ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{item.graduated ? (locale === "fr" ? "Diplome" : "Graduate") : (locale === "fr" ? "En cours" : "In progress")}</span></td><td className="p-3 text-slate-500">{item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString(locale) : "-"}</td></tr>)}</tbody>
      </table></div>
      {!error && visible.length === 0 && <p className="py-10 text-center text-slate-500">{locale === "fr" ? "Aucun apprenant inscrit pour le moment." : "No learners enrolled yet."}</p>}
    </div>
  </div>;
}
