import { lessonMediaCatalog } from "@/data/lesson-media";
import { localCourses } from "@/data/local-courses";
import { marketplaceCourses } from "@/data/marketplace-catalog";
import type { StudioCourse, StudioLessonType } from "@/types/instructor-studio";

const LEGACY_DATE = "2026-01-01T00:00:00.000Z";

function lessonType(value: string): StudioLessonType {
  return ["video", "quiz", "case-study", "resource"].includes(value)
    ? (value as StudioLessonType)
    : "reading";
}

export const legacyStudioCourses: StudioCourse[] = marketplaceCourses.map(
  (marketplace) => {
    const source = localCourses.find((course) => course.slug === marketplace.slug);
    return {
      id: marketplace.id,
      code: marketplace.code,
      slug: marketplace.slug,
      title: source?.titleFr || marketplace.subtitle,
      titleEn: source?.title || marketplace.title,
      subtitle: marketplace.subtitle,
      subtitleEn: marketplace.title,
      description: source?.description || marketplace.description,
      descriptionEn: marketplace.description,
      category: marketplace.category,
      language: marketplace.language,
      contentLanguages: ["fr", "en"],
      level: marketplace.level,
      priceUsd: marketplace.priceUsd,
      status: marketplace.published ? "published" : "draft",
      buildApproved: true,
      createdByRole: "admin",
      instructorUserId: marketplace.instructorId,
      modules: (source?.modules ?? []).map((module) => ({
        id: module.id,
        slug: module.slug,
        title: module.title,
        titleEn: module.titleEn,
        description: module.description,
        descriptionEn: module.description,
        lessons: module.lessons.map((lesson) => {
          const media = lessonMediaCatalog.find(
            (item) =>
              item.courseSlug === marketplace.slug &&
              item.moduleSlug === module.slug &&
              item.lessonSlug === lesson.slug,
          );
          return {
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            titleEn: lesson.titleEn,
            type: lessonType(lesson.type),
            durationMinutes: lesson.durationMinutes,
            content: lesson.description,
            contentEn: lesson.description,
            videoUrl: media?.videoUrl,
            videoUrlEn: media?.videoUrl,
          };
        }),
      })),
      quizzes: [],
      finalExam: null,
      certification: {
        enabled: marketplace.slug === "camms",
        minimumCourseProgress: 100,
        academicDirector: "NutVitaGlobalis Academy",
        proctoredExam: true,
        minimumBookingLeadDays: 7,
        maximumCandidatesPerRoom: 10,
        identityThreshold: 85,
      },
      reviewNotes:
        "Contenu historique import? automatiquement. V?rifiez et compl?tez les modules avant la prochaine publication.",
      publishedAt: marketplace.published ? LEGACY_DATE : undefined,
      createdAt: LEGACY_DATE,
      updatedAt: LEGACY_DATE,
    };
  },
);

export function mergeLegacyStudioCourses(courses: StudioCourse[]) {
  const existingSlugs = new Set(courses.map((course) => course.slug));
  return [
    ...courses,
    ...legacyStudioCourses.filter((course) => !existingSlugs.has(course.slug)),
  ];
}
