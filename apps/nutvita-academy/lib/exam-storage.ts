import type {
  ExamAttempt,
  ExamSession,
} from "@/types/exam";

const SESSION_PREFIX =
  "nutvita-exam-session";

const ATTEMPT_PREFIX =
  "nutvita-exam-attempts";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function sessionKey(
  userId: string,
  examSlug: string
): string {
  return `${SESSION_PREFIX}:${userId}:${examSlug}`;
}

function attemptsKey(
  userId: string
): string {
  return `${ATTEMPT_PREFIX}:${userId}`;
}

export function saveExamSession(
  session: ExamSession
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    sessionKey(
      session.userId,
      session.examSlug
    ),
    JSON.stringify(session)
  );
}

export function loadExamSession(
  userId: string,
  examSlug: string
): ExamSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const value =
      localStorage.getItem(
        sessionKey(
          userId,
          examSlug
        )
      );

    if (!value) {
      return null;
    }

    return JSON.parse(
      value
    ) as ExamSession;
  } catch {
    return null;
  }
}

export function removeExamSession(
  userId: string,
  examSlug: string
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(
    sessionKey(
      userId,
      examSlug
    )
  );
}

export function loadExamAttempts(
  userId: string
): ExamAttempt[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const value =
      localStorage.getItem(
        attemptsKey(userId)
      );

    if (!value) {
      return [];
    }

    return JSON.parse(
      value
    ) as ExamAttempt[];
  } catch {
    return [];
  }
}

export function saveExamAttempts(
  userId: string,
  attempts: ExamAttempt[]
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    attemptsKey(userId),
    JSON.stringify(attempts)
  );
}
export function publishExamAttemptResult(userId: string, attemptId: string): void {
  const attempts = loadExamAttempts(userId).map((attempt) => attempt.id === attemptId ? { ...attempt, resultVisibility: "published" as const } : attempt);
  saveExamAttempts(userId, attempts);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("nutvita-exam-attempts-updated"));
}