"use client";

import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { getLocalModuleBySlug } from "@/lib/course-catalog";
import {
  getStudioCourseBySlug,
  studioCourseToAcademyCourse,
} from "@/lib/studio-course-runtime";
import { ModuleLearningWorkspace } from "@/components/progress/ModuleLearningWorkspace";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useLanguage } from "@/hooks/use-language";

export function PublishedModuleResolver({
  courseSlug,
  moduleSlug,
  selectedLessonSlug,
}: {
  courseSlug: string;
  moduleSlug: string;
  selectedLessonSlug?: string;
}) {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const { isEnrolled, usesServerCatalog } = useMarketplace();
  const local = getLocalModuleBySlug(courseSlug, moduleSlug);
  const studio = getStudioCourseBySlug(data, courseSlug);
  const course =
    local?.course ??
    (studio ? studioCourseToAcademyCourse(studio, locale) : null);
  const courseModule =
    local?.module ??
    course?.modules.find((item) => item.slug === moduleSlug) ??
    null;
  if (!course || !courseModule)
    return (
      <div className="mx-auto max-w-3xl p-10 text-center">
        {text(
          "Module introuvable ou non publié.",
          "Module not found or unpublished.",
        )}
      </div>
    );
  if (usesServerCatalog && !isEnrolled(course.slug))
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-amber-200 bg-amber-50 p-10 text-center text-amber-900">
        {text(
          "Cette formation n’est pas inscrite dans votre compte. Finalisez votre commande depuis le Marketplace.",
          "This course is not enrolled in your account. Complete your order in the Marketplace.",
        )}
      </div>
    );
  return (
    <ModuleLearningWorkspace
      course={course}
      module={courseModule}
      selectedLessonSlug={selectedLessonSlug}
    />
  );
}
