export type LessonProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type LessonProgress = {
  lessonId: string;
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;

  status: LessonProgressStatus;
  progressPercent: number;

  lastPositionSeconds: number;
  timeSpentSeconds: number;

  firstOpenedAt: string;
  lastVisitedAt: string;
  completedAt?: string;
};

export type CourseLearningPosition = {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  updatedAt: string;
};

export type StudentProgressData = {
  version: 1;
  lessons: Record<string, LessonProgress>;
  lastPositions: Record<string, CourseLearningPosition>;
  exams: Record<string, ExamProgress>;
};

export type ExamProgress = {
  courseSlug: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  attempts: number;
  lastAttemptAt: string;
  passedAt?: string;
};

export type ProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  startedLessons: number;
  progressPercent: number;
  totalTimeSeconds: number;
};
