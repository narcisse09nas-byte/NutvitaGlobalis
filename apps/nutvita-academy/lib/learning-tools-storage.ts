import type {
  FavoriteLesson,
  LearningHistoryEntry,
  LearningToolsData,
  LessonNote,
  LessonReference,
} from "@/types/learning-tools";

const STORAGE_PREFIX =
  "nutvita-learning-tools";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorageKey(
  userId: string
): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function createEmptyLearningToolsData(): LearningToolsData {
  return {
    version: 1,
    notes: [],
    favorites: [],
    history: [],
  };
}

export function loadLearningToolsData(
  userId: string
): LearningToolsData {
  if (!isBrowser()) {
    return createEmptyLearningToolsData();
  }

  try {
    const storedValue =
      localStorage.getItem(
        getStorageKey(userId)
      );

    if (!storedValue) {
      return createEmptyLearningToolsData();
    }

    const parsedValue =
      JSON.parse(
        storedValue
      ) as LearningToolsData;

    return {
      version: 1,
      notes: parsedValue.notes ?? [],
      favorites:
        parsedValue.favorites ?? [],
      history: parsedValue.history ?? [],
    };
  } catch {
    return createEmptyLearningToolsData();
  }
}

export function saveLearningToolsData(
  userId: string,
  data: LearningToolsData
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(data)
  );
}

export function createLessonNote(
  userId: string,
  reference: LessonReference,
  content: string,
  videoTimeSeconds?: number
): LessonNote {
  const now =
    new Date().toISOString();

  return {
    id:
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),

    userId,
    ...reference,
    content,
    videoTimeSeconds,
    createdAt: now,
    updatedAt: now,
  };
}

export function createFavoriteLesson(
  userId: string,
  reference: LessonReference
): FavoriteLesson {
  return {
    id:
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),

    userId,
    ...reference,
    createdAt:
      new Date().toISOString(),
  };
}

export function createHistoryEntry(
  userId: string,
  reference: LessonReference,
  videoTimeSeconds?: number
): LearningHistoryEntry {
  return {
    id:
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),

    userId,
    ...reference,
    videoTimeSeconds,
    visitedAt:
      new Date().toISOString(),
  };
}