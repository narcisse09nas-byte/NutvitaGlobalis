import { localCourses } from "@/data/local-courses";
import type {
  AcademyCourse,
  CourseModule,
} from "@/types/course";

export function getAllLocalCourses(): AcademyCourse[] {
  return localCourses;
}

export function getEnrolledLocalCourses(): AcademyCourse[] {
  return localCourses.filter(
    (course) => course.enrolled
  );
}

export function getLocalCourseBySlug(
  slug: string
): AcademyCourse | null {
  return (
    localCourses.find(
      (course) => course.slug === slug
    ) ?? null
  );
}

export function getLocalModuleBySlug(
  courseSlug: string,
  moduleSlug: string
): {
  course: AcademyCourse;
  module: CourseModule;
} | null {
  const course =
    getLocalCourseBySlug(courseSlug);

  if (!course) {
    return null;
  }

  const courseModule = course.modules.find(
    (item) => item.slug === moduleSlug
  );

  if (!courseModule) {
    return null;
  }

  return {
    course,
    module: courseModule,
  };
}

export function getCourseLessonCount(
  course: AcademyCourse
): number {
  return course.modules.reduce(
    (total, module) =>
      total + module.lessons.length,
    0
  );
}

export function getCourseDurationMinutes(
  course: AcademyCourse
): number {
  return course.modules.reduce(
    (total, module) =>
      total + module.estimatedMinutes,
    0
  );
}
