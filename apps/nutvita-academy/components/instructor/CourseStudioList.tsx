"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useLanguage } from "@/hooks/use-language";
import { useLocalAuth } from "@/hooks/use-local-auth";
import type { StudioCourseStatus } from "@/types/instructor-studio";

export function CourseStudioList() {
  const { data, createCourse, updateStatus, deleteCourse } =
    useInstructorStudio();
  const { user } = useLocalAuth();
  const { locale } = useLanguage();
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [code, setCode] = useState("");
  const isAdministrator =
    user?.role === "admin" || user?.role === "super_admin";
  const visibleCourses = isAdministrator
    ? data.courses
    : data.courses.filter((course) => course.instructorUserId === user?.id);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!title.trim() && !titleEn.trim()) || !code.trim()) return;
    createCourse({
      title: title.trim() || titleEn.trim(),
      titleEn: titleEn.trim(),
      code: code.trim(),
    });
    setTitle("");
    setTitleEn("");
    setCode("");
  }

  function changeStatus(courseId: string, status: StudioCourseStatus) {
    const result = updateStatus(courseId, status);
    if (!result.success) window.alert(result.error);
  }

  return (
    <div className="space-y-7">
      <form
        onSubmit={submit}
        className="rounded-[24px] border border-green-100 bg-white p-6"
      >
        <h2 className="text-xl font-extrabold text-[#063D2E]">
          {locale === "fr"
            ? "Nouvelle formation bilingue"
            : "New bilingual course"}
        </h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_160px_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="🇫🇷 Titre de la formation"
            className="h-12 rounded-2xl border border-blue-200 px-4"
          />
          <input
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            placeholder="🇬🇧 Course title"
            className="h-12 rounded-2xl border border-amber-200 px-4"
          />
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Code"
            className="h-12 rounded-2xl border border-slate-200 px-4"
          />
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#F58220] px-6 font-bold text-white">
            <Plus size={18} /> {locale === "fr" ? "Créer" : "Create"}
          </button>
        </div>
      </form>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleCourses.map((course) => (
          <article
            key={course.id}
            className="rounded-[24px] border border-green-100 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
                {course.code}
              </span>
              <select
                value={course.status}
                onChange={(event) =>
                  changeStatus(
                    course.id,
                    event.target.value as StudioCourseStatus,
                  )
                }
                className="rounded-xl border border-slate-200 bg-[#FFF8DD] px-3 py-2 text-xs text-[#063D2E]"
              >
                <option value="draft">
                  {locale === "fr" ? "Brouillon" : "Draft"}
                </option>
                <option value="review">
                  {locale === "fr" ? "En révision" : "In review"}
                </option>
                {isAdministrator && (
                  <option value="published">
                    {locale === "fr" ? "Publié" : "Published"}
                  </option>
                )}
                <option value="archived">
                  {locale === "fr" ? "Archivé" : "Archived"}
                </option>
              </select>
            </div>
            <h3 className="mt-5 text-xl font-extrabold text-[#063D2E]">
              🇫🇷 {course.title || "—"}
            </h3>
            <p className="font-semibold text-slate-600">
              🇬🇧 {course.titleEn || "Missing English title"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {course.modules.length} module(s) · {course.quizzes.length} quiz
            </p>
            <Link
              href={`/dashboard/instructor/courses/${course.id}`}
              className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white"
            >
              {locale === "fr" ? "Ouvrir le studio" : "Open Studio"}
            </Link>
            <button
              type="button"
              onClick={() =>
                window.confirm(
                  locale === "fr"
                    ? "Supprimer définitivement cette formation ?"
                    : "Permanently delete this course?",
                ) && deleteCourse(course.id)
              }
              className="ml-4 inline-flex text-sm font-bold text-red-600"
            >
              <Trash2 size={16} className="mr-1" />{" "}
              {locale === "fr" ? "Supprimer" : "Delete"}
            </button>
          </article>
        ))}
        {visibleCourses.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">
            {locale === "fr"
              ? "Aucune formation créée dans le Studio."
              : "No course has been created in Studio."}
          </div>
        )}
      </div>
    </div>
  );
}
