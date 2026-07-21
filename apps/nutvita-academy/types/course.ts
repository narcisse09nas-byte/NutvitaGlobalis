import type { ApplicationExercise } from "@/types/application-exercise";

export type LessonType =
  "video" | "interactive-html" | "reading" | "quiz" | "case-study" | "resource";

export type LessonStatus = "available" | "locked" | "completed";

export type CourseLesson = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  type: LessonType;
  durationMinutes: number;
  status: LessonStatus;
  videoUrl?: string;
  htmlUrl?: string;
  quizSlug?: string;
  resourceUrl?: string;
};

export type CourseModule = {
  id: string;
  slug: string;
  number: number;
  title: string;
  titleEn: string;
  description: string;
  estimatedMinutes: number;
  lessons: CourseLesson[];
};

export type AcademyCourse = {
  id: string;
  slug: string;
  code: string;
  title: string;
  titleFr: string;
  description: string;
  category: string;
  level: string;
  language: string;
  priceUsd: number;
  durationHours: number;
  progress: number;
  enrolled: boolean;
  featured: boolean;
  modules: CourseModule[];
  applicationExercises?: ApplicationExercise[];
};
