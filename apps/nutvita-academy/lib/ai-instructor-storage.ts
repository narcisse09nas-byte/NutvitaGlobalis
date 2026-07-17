import type {
  AiInstructorConversation,
} from "@/types/ai-instructor";

const STORAGE_PREFIX =
  "nutvita-ai-instructor";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(
  userId: string
): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function loadAiConversation(
  userId: string
): AiInstructorConversation | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const stored =
      localStorage.getItem(
        storageKey(userId)
      );

    if (!stored) {
      return null;
    }

    return JSON.parse(
      stored
    ) as AiInstructorConversation;
  } catch {
    return null;
  }
}

export function saveAiConversation(
  conversation: AiInstructorConversation
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    storageKey(
      conversation.userId
    ),
    JSON.stringify(conversation)
  );
}

export function removeAiConversation(
  userId: string
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(
    storageKey(userId)
  );
}