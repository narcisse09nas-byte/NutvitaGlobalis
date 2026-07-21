"use client";

import Link from "next/link";

import { FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useLearningTools } from "@/hooks/use-learning-tools";
import { formatVideoTime } from "@/lib/video-storage";
import { loadManualGrades } from "@/lib/gradebook-storage";
import { useLocalAuth } from "@/hooks/use-local-auth";
import type { ManualGrade } from "@/types/gradebook";
import { useLanguage } from "@/hooks/use-language";
import { FinalGradeOverview } from "@/components/grades/FinalGradeOverview";

export default function NotesPage() {
  const { text } = useLanguage();
  const { user } = useLocalAuth();
  const [assignedGrades, setAssignedGrades] = useState<ManualGrade[]>([]);
  useEffect(() => {
    setAssignedGrades(
      loadManualGrades().filter((grade) => grade.studentUserId === user?.id),
    );
  }, [user?.id]);
  const { notes, deleteNote, isLoading } = useLearningTools();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        {text("Apprentissage", "Learning")}
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Mes notes", "My notes")}
      </h1>

      <p className="mt-3 max-w-3xl text-slate-600">
        {text(
          "Retrouvez toutes vos notes personnelles enregistrées pendant les formations.",
          "Find all the personal notes saved during your courses.",
        )}
      </p>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="rounded-[24px] bg-white p-8">
            {text("Chargement…", "Loading…")}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
            <FileText size={40} className="mx-auto text-[#0B5D3B]" />

            <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
              {text("Aucune note enregistrée", "No saved notes")}
            </h2>
          </div>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-[24px] border border-green-100 bg-white p-6"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#F58220]">
                    {note.courseTitle}
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-[#063D2E]">
                    {note.lessonTitle}
                  </h2>

                  <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">
                    {note.content}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>{note.moduleTitle}</span>

                    {note.videoTimeSeconds !== undefined && (
                      <span>
                        {text("Position", "Position")}:{" "}
                        {formatVideoTime(note.videoTimeSeconds)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-3">
                  <Link
                    href={`/dashboard/courses/${note.courseSlug}/${note.moduleSlug}?lesson=${note.lessonSlug}`}
                    className="rounded-full border border-[#0B5D3B] px-4 py-2 text-sm font-bold text-[#0B5D3B]"
                  >
                    {text("Ouvrir", "Open")}
                  </Link>

                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-10"><FinalGradeOverview learnerOnly /></div>

      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text(
            "Notes et appréciations du formateur",
            "Instructor grades and feedback",
          )}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {assignedGrades.map((grade) => (
            <article
              key={grade.id}
              className="rounded-[24px] border border-green-100 bg-white p-6"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#F58220]">
                {grade.courseSlug}
              </p>
              <h3 className="mt-2 text-xl font-extrabold text-[#063D2E]">
                {grade.activityTitle}
              </h3>
              <p className="mt-4 text-3xl font-extrabold text-[#0B5D3B]">
                {grade.scorePercent}/100
              </p>
              {grade.feedback && (
                <p className="mt-4 leading-7 text-slate-600">
                  {grade.feedback}
                </p>
              )}
            </article>
          ))}
          {assignedGrades.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-8 text-center text-slate-500 md:col-span-2">
              {text(
                "Aucune note attribuée par un formateur.",
                "No grade has been assigned by an instructor.",
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}