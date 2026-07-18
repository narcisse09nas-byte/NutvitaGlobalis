"use client";

import { Save, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { StudioCertificationEditor } from "@/components/instructor/StudioCertificationEditor";
import { StudioCurriculumBuilder } from "@/components/instructor/StudioCurriculumBuilder";
import { StudioExamBuilder } from "@/components/instructor/StudioExamBuilder";
import { validateStudioCourse } from "@/components/instructor/InstructorStudioProvider";
import { StudioQuizBuilder } from "@/components/instructor/StudioQuizBuilder";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useLanguage } from "@/hooks/use-language";
import { useLocalAuth } from "@/hooks/use-local-auth";
import type {
  StudioCourse,
  StudioCourseStatus,
} from "@/types/instructor-studio";

const statusLabels: Record<StudioCourseStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" },
  review: { fr: "En révision", en: "In review" },
  published: { fr: "Publié", en: "Published" },
  archived: { fr: "Archivé", en: "Archived" },
};

const inputClass = "mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4";

export function CourseStudioEditor({ courseId }: { courseId: string }) {
  const { data, updateCourse, updateStatus, canManageCourse } =
    useInstructorStudio();
  const { user } = useLocalAuth();
  const { locale } = useLanguage();
  const isAdministrator = user?.role === "admin" || user?.role === "super_admin";
  const [instructors, setInstructors] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  useEffect(() => {
    if (!isAdministrator) return;
    void fetch("/api/studio/courses?directory=instructors", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { instructors: [] })
      .then((payload: { instructors?: Array<{ id: string; full_name: string; email: string }> }) =>
        setInstructors(payload.instructors ?? []));
  }, [isAdministrator]);

  const course = data.courses.find((item) => item.id === courseId) ?? null;
  if (!course)
    return (
      <div className="rounded-[24px] bg-white p-8">
        {locale === "fr" ? "Formation introuvable." : "Course not found."}
      </div>
    );
  if (!canManageCourse(course))
    return (
      <div className="rounded-[24px] bg-red-50 p-8 text-red-700">
        {locale === "fr"
          ? "Vous ne pouvez pas modifier cette formation."
          : "You cannot edit this course."}
      </div>
    );

  const errors = validateStudioCourse(course);
  const change = (patch: Partial<StudioCourse>) =>
    updateCourse(course.id, patch);
  const changeStatus = (status: StudioCourseStatus) => {
    const result = updateStatus(course.id, status);
    if (!result.success) window.alert(result.error);
  };
  const toggleLanguage = (language: "fr" | "en") => {
    const enabled = course.contentLanguages.includes(language);
    const contentLanguages = enabled
      ? course.contentLanguages.filter((item) => item !== language)
      : [...course.contentLanguages, language];
    const courseLanguage =
      contentLanguages.includes("fr") && contentLanguages.includes("en")
        ? "Français / English"
        : contentLanguages.includes("en")
          ? "English"
          : "Français";
    change({ contentLanguages, language: courseLanguage });
  };

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] border border-green-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
              {course.code}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#063D2E]">
              {locale === "en" && course.titleEn
                ? course.titleEn
                : course.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {locale === "fr" ? "Statut" : "Status"}:{" "}
              <strong>{statusLabels[course.status][locale]}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isAdministrator && course.buildApproved && (
              <button
                type="button"
                onClick={() => changeStatus("review")}
                className="rounded-full bg-[#F58220] px-5 py-3 text-sm font-bold text-white"
              >
                {locale === "fr"
                  ? "Soumettre en révision"
                  : "Submit for review"}
              </button>
            )}
            {isAdministrator && (
              <>
                <button
                  type="button"
                  onClick={() => changeStatus("draft")}
                  className="rounded-full border border-[#0B5D3B] px-5 py-3 text-sm font-bold text-[#0B5D3B]"
                >
                  {locale === "fr"
                    ? "Remettre en brouillon"
                    : "Return to draft"}
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus("published")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white"
                >
                  <ShieldCheck size={17} />
                  {locale === "fr"
                    ? "Valider et publier"
                    : "Approve and publish"}
                </button>
              </>
            )}
          </div>
        </div>

        {!course.buildApproved && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-extrabold">{locale === "fr" ? "Validation administrative requise" : "Administrative approval required"}</p>
            <p className="mt-1 text-sm">
              {locale === "fr"
                ? "Le formateur pourra construire les modules, lecons, quiz et examens apres cette validation."
                : "The instructor can build modules, lessons, quizzes and exams after approval."}
            </p>
            {isAdministrator && (
              <button type="button" onClick={() => change({ buildApproved: true, status: "draft" })}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white">
                <UserCheck size={17} /> {locale === "fr" ? "Autoriser la construction" : "Approve course building"}
              </button>
            )}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="font-bold text-orange-800">
              {locale === "fr" ? "Avant publication :" : "Before publishing:"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-orange-700">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/50 p-4">
          <p className="font-extrabold text-[#063D2E]">
            {locale === "fr"
              ? "Langues de publication"
              : "Publishing languages"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {locale === "fr"
              ? "Une langue cochée devient obligatoire avant publication."
              : "Every selected language is required before publishing."}
          </p>
          <div className="mt-3 flex gap-5">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={course.contentLanguages.includes("fr")}
                onChange={() => toggleLanguage("fr")}
              />
              Français
            </label>
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={course.contentLanguages.includes("en")}
                onChange={() => toggleLanguage("en")}
              />
              English
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <fieldset className="rounded-2xl border border-blue-200 p-5">
            <legend className="px-2 font-extrabold text-blue-800">
              🇫🇷 Contenu français
            </legend>
            <label className="block text-sm font-bold text-[#063D2E]">
              Titre
              <input
                value={course.title}
                onChange={(event) => change({ title: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#063D2E]">
              Sous-titre
              <input
                value={course.subtitle}
                onChange={(event) => change({ subtitle: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#063D2E]">
              Description
              <textarea
                value={course.description}
                onChange={(event) =>
                  change({ description: event.target.value })
                }
                rows={5}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
          </fieldset>

          <fieldset className="rounded-2xl border border-amber-200 p-5">
            <legend className="px-2 font-extrabold text-amber-800">
              🇬🇧 English content
            </legend>
            <label className="block text-sm font-bold text-[#063D2E]">
              Title
              <input
                value={course.titleEn}
                onChange={(event) => change({ titleEn: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#063D2E]">
              Subtitle
              <input
                value={course.subtitleEn}
                onChange={(event) => change({ subtitleEn: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#063D2E]">
              Description
              <textarea
                value={course.descriptionEn}
                onChange={(event) =>
                  change({ descriptionEn: event.target.value })
                }
                rows={5}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
          </fieldset>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-[#063D2E]">
            {locale === "fr" ? "Catégorie" : "Category"}
            <input
              value={course.category}
              onChange={(event) => change({ category: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-bold text-[#063D2E]">
            {locale === "fr" ? "Niveau" : "Level"}
            <input
              value={course.level}
              onChange={(event) => change({ level: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-bold text-[#063D2E]">
            {locale === "fr" ? "Prix USD" : "Price in USD"}
            <input
              type="number"
              min={0}
              value={course.priceUsd}
              onChange={(event) =>
                change({ priceUsd: Number(event.target.value) })
              }
              className={inputClass}
            />
          </label>
        </div>

        {isAdministrator && (
          <label className="mt-5 block text-sm font-bold text-[#063D2E]">
            {locale === "fr" ? "Formateur responsable" : "Assigned instructor"}
            <select value={course.instructorUserId}
              onChange={(event) => change({ instructorUserId: event.target.value })}
              className={inputClass}>
              {!instructors.some((item) => item.id === course.instructorUserId) && (
                <option value={course.instructorUserId}>{locale === "fr" ? "Responsable actuel" : "Current owner"}</option>
              )}
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.full_name || instructor.email} ({instructor.email})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-4 block text-sm font-bold text-[#063D2E]">
          {locale === "fr" ? "Notes de révision" : "Review notes"}
          <textarea
            value={course.reviewNotes}
            onChange={(event) => change({ reviewNotes: event.target.value })}
            rows={3}
            placeholder={
              locale === "fr"
                ? "Commentaires entre formateur et administration"
                : "Comments between instructor and administration"
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-green-700">
          <Save size={17} />
          {locale === "fr" ? "Sauvegarde automatique" : "Automatic saving"}
        </div>
      </section>

      {(course.buildApproved || isAdministrator) && <>
        <StudioCurriculumBuilder course={course} onChange={change} />
        <StudioQuizBuilder course={course} onChange={change} />
        <StudioExamBuilder course={course} onChange={change} />
        <StudioCertificationEditor course={course} onChange={change} />
      </>}
    </div>
  );
}
