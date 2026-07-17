import type {
  CourseLearningPosition,
  LessonProgress,
  StudentProgressData,
} from "@/types/progress";

const STORAGE_PREFIX = "nutvita-learning-progress";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function createEmptyProgressData(): StudentProgressData {
  return {
    version: 1,
    lessons: {},
    lastPositions: {},
    exams: {},
  };
}

export function getLessonProgressKey(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string
): string {
  return `${courseSlug}:${moduleSlug}:${lessonSlug}`;
}

export function loadStudentProgress(
  userId: string
): StudentProgressData {
  if (!isBrowser()) {
    return createEmptyProgressData();
  }

  try {
    const storedValue = localStorage.getItem(
      getStorageKey(userId)
    );

    if (!storedValue) {
      return createEmptyProgressData();
    }

    const parsedValue = JSON.parse(
      storedValue
    ) as StudentProgressData;

    if (
      !parsedValue ||
      parsedValue.version !== 1 ||
      typeof parsedValue.lessons !== "object"
    ) {
      return createEmptyProgressData();
    }

    return {
      version: 1,
      lessons: parsedValue.lessons ?? {},
      lastPositions: parsedValue.lastPositions ?? {},
      exams: parsedValue.exams ?? {},
    };
  } catch {
    return createEmptyProgressData();
  }
}

export function saveStudentProgress(
  userId: string,
  progress: StudentProgressData
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(progress)
  );
}

export function createLessonProgress(input: {
  lessonId: string;
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
}): LessonProgress {
  const now = new Date().toISOString();

  return {
    ...input,
    status: "in_progress",
    progressPercent: 0,
    lastPositionSeconds: 0,
    timeSpentSeconds: 0,
    firstOpenedAt: now,
    lastVisitedAt: now,
  };
}

export function updateLastCoursePosition(
  progress: StudentProgressData,
  position: CourseLearningPosition
): StudentProgressData {
  return {
    ...progress,
    lastPositions: {
      ...progress.lastPositions,
      [position.courseSlug]: position,
    },
  };
}

export function clearStudentProgress(
  userId: string
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(
    getStorageKey(userId)
  );
}
