import type {
  QuizAttempt,
} from "@/types/quiz";

const QUIZ_STORAGE_PREFIX =
  "nutvita-quiz-attempts";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorageKey(
  userId: string
): string {
  return `${QUIZ_STORAGE_PREFIX}:${userId}`;
}

export function loadQuizAttempts(
  userId: string
): QuizAttempt[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const storedValue =
      localStorage.getItem(
        getStorageKey(userId)
      );

    if (!storedValue) {
      return [];
    }

    return JSON.parse(
      storedValue
    ) as QuizAttempt[];
  } catch {
    return [];
  }
}

export function saveQuizAttempts(
  userId: string,
  attempts: QuizAttempt[]
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(attempts)
  );
}

export function createAttemptId(): string {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `attempt-${Date.now()}`;
}