import type { ExamDefinition, ExamQuestion } from "@/types/exam";
import type { QuizDefinition } from "@/types/quiz";

export type StudioCourseStatus = "draft" | "review" | "published" | "archived";
export type StudioLessonType =
  | "video"
  | "interactive-html"
  | "reading"
  | "quiz"
  | "case-study"
  | "resource";

export type StudioLesson = {
  id: string;
  title: string;
  titleEn: string;
  slug: string;
  type: StudioLessonType;
  durationMinutes: number;
  content: string;
  contentEn: string;
  videoUrl?: string;
  videoUrlEn?: string;
  htmlUrl?: string;
  htmlUrlEn?: string;
  resourceUrl?: string;
  resourceUrlEn?: string;
};

export type StudioModule = {
  id: string;
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  lessons: StudioLesson[];
};

export type StudioFinalExam = {
  definition: ExamDefinition;
  questions: ExamQuestion[];
};

export type StudioCertificationSettings = {
  enabled: boolean;
  minimumCourseProgress: number;
  academicDirector: string;
  proctoredExam: boolean;
  minimumBookingLeadDays: number;
  maximumCandidatesPerRoom: number;
  identityThreshold: number;
};

export type StudioCourse = {
  id: string;
  code: string;
  slug: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  description: string;
  descriptionEn: string;
  category: string;
  language: string;
  contentLanguages: ("fr" | "en")[];
  level: string;
  priceUsd: number;
  status: StudioCourseStatus;
  instructorUserId: string;
  modules: StudioModule[];
  quizzes: QuizDefinition[];
  finalExam: StudioFinalExam | null;
  certification: StudioCertificationSettings;
  reviewNotes: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioStoreData = { version: 4; courses: StudioCourse[] };
