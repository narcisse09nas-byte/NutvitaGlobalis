export type LessonReference = {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
};

export type LessonNote = LessonReference & {
  id: string;
  userId: string;
  content: string;
  videoTimeSeconds?: number;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteLesson = LessonReference & {
  id: string;
  userId: string;
  createdAt: string;
};

export type LearningHistoryEntry = LessonReference & {
  id: string;
  userId: string;
  visitedAt: string;
  videoTimeSeconds?: number;
};

export type LearningToolsData = {
  version: 1;
  notes: LessonNote[];
  favorites: FavoriteLesson[];
  history: LearningHistoryEntry[];
};