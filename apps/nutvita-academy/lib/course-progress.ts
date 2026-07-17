import { getLessonProgressKey } from "@/lib/local-progress";
import type { AcademyCourse, CourseLesson, CourseModule } from "@/types/course";
import type { StudentProgressData } from "@/types/progress";

export type CourseLessonEntry = { module: CourseModule; lesson: CourseLesson };

export function getCourseLessonEntries(course: AcademyCourse): CourseLessonEntry[] {
  return course.modules.flatMap((courseModule) =>
    courseModule.lessons.map((lesson) => ({ module: courseModule, lesson })),
  );
}

export function isLessonCompleted(
  data: StudentProgressData,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): boolean {
  return data.lessons[getLessonProgressKey(courseSlug, moduleSlug, lessonSlug)]?.status === "completed";
}

export function isLessonUnlocked(
  course: AcademyCourse,
  data: StudentProgressData,
  moduleSlug: string,
  lessonSlug: string,
): boolean {
  const current = course.modules
    .find((module) => module.slug === moduleSlug)
    ?.lessons.find((lesson) => lesson.slug === lessonSlug);
  if (current?.type === "resource") return true;
  const entries = getCourseLessonEntries(course);
  const index = entries.findIndex(
    (entry) => entry.module.slug === moduleSlug && entry.lesson.slug === lessonSlug,
  );
  if (index < 0) return false;
  const previous = entries
    .slice(0, index)
    .filter(({ lesson }) => lesson.type !== "resource")
    .at(-1);
  if (!previous) return true;
  return isLessonCompleted(data, course.slug, previous.module.slug, previous.lesson.slug);
}

export function isCourseCompleted(course: AcademyCourse, data: StudentProgressData): boolean {
  const entries = getCourseLessonEntries(course).filter(
    ({ lesson }) => lesson.type !== "resource",
  );
  return entries.length > 0 && entries.every(({ module, lesson }) =>
    isLessonCompleted(data, course.slug, module.slug, lesson.slug),
  );
}

export function getNextLearningEntry(course: AcademyCourse, data: StudentProgressData): CourseLessonEntry | null {
  const entries = getCourseLessonEntries(course).filter(
    ({ lesson }) => lesson.type !== "resource",
  );
  return entries.find(({ module, lesson }) =>
    isLessonUnlocked(course, data, module.slug, lesson.slug) &&
    !isLessonCompleted(data, course.slug, module.slug, lesson.slug),
  ) ?? null;
}
