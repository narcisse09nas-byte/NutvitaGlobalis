"use client";

import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { getLocalCourseBySlug } from "@/lib/course-catalog";
import {
  getStudioCourseBySlug,
  studioCourseToAcademyCourse,
} from "@/lib/studio-course-runtime";
import { CourseOverview } from "@/components/courses/CourseOverview";
import { CourseModuleList } from "@/components/courses/CourseModuleList";
import { CourseProgressSummary } from "@/components/progress/CourseProgressSummary";
import { ContinueLearningButton } from "@/components/progress/ContinueLearningButton";
import { useLanguage } from "@/hooks/use-language";

export function PublishedCourseResolver({
  courseSlug,
}: {
  courseSlug: string;
}) {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const studioCourse = getStudioCourseBySlug(data, courseSlug);
  const course =
    getLocalCourseBySlug(courseSlug) ??
    (studioCourse ? studioCourseToAcademyCourse(studioCourse, locale) : null);
  if (!course)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[24px] bg-white p-8 text-center">
          <h1 className="text-2xl font-extrabold text-[#063D2E]">
            {text(
              "Formation introuvable ou non publiée",
              "Course not found or unpublished",
            )}
          </h1>
        </div>
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CourseOverview course={course} />
      <div className="mt-8">
        <CourseProgressSummary course={course} />
      </div>
      <div className="mt-6 flex justify-end">
        <ContinueLearningButton course={course} />
      </div>
      <section className="mt-10">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Programme de la certification", "Certification curriculum")}
        </h2>
        <p className="mt-3 text-slate-600">
          {text(
            "Parcourez les modules et reprenez votre apprentissage.",
            "Browse the modules and continue your learning.",
          )}
        </p>
        <div className="mt-8">
          <CourseModuleList course={course} />
        </div>
      </section>
    </div>
  );
}
