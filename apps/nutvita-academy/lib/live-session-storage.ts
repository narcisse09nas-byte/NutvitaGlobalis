import type {
  LiveAttendance,
  LiveChatMessage,
  LiveRegistration,
  LiveSession,
  LiveSessionStore,
} from "@/types/live-session";

const STORAGE_KEY =
  "nutvita-live-session-store";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function createEmptyLiveSessionStore(): LiveSessionStore {
  return {
    version: 1,
    sessions: [],
    registrations: [],
    attendance: [],
    messages: [],
  };
}

export function loadLiveSessionStore(): LiveSessionStore {
  if (!isBrowser()) {
    return createEmptyLiveSessionStore();
  }

  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return createEmptyLiveSessionStore();
    }

    const parsed =
      JSON.parse(
        raw
      ) as LiveSessionStore;

    return {
      version: 1,
      sessions: parsed.sessions ?? [],
      registrations:
        parsed.registrations ?? [],
      attendance:
        parsed.attendance ?? [],
      messages:
        parsed.messages ?? [],
    };
  } catch {
    return createEmptyLiveSessionStore();
  }
}

export function saveLiveSessionStore(
  data: LiveSessionStore
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function createId(
  prefix: string
): string {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function createLiveSessionRecord(
  input: Omit<
    LiveSession,
    "id" | "createdAt" | "updatedAt"
  >
): LiveSession {
  const now =
    new Date().toISOString();

  return {
    ...input,
    id: createId("live"),
    createdAt: now,
    updatedAt: now,
  };
}

export function createRegistration(
  input: Omit<
    LiveRegistration,
    "id" | "registeredAt"
  >
): LiveRegistration {
  return {
    ...input,
    id: createId("registration"),
    registeredAt:
      new Date().toISOString(),
  };
}

export function createAttendance(
  input: Omit<
    LiveAttendance,
    "id" | "durationSeconds"
  >
): LiveAttendance {
  return {
    ...input,
    id: createId("attendance"),
    durationSeconds: 0,
  };
}

export function createChatMessage(
  input: Omit<
    LiveChatMessage,
    "id" | "createdAt"
  >
): LiveChatMessage {
  return {
    ...input,
    id: createId("message"),
    createdAt:
      new Date().toISOString(),
  };
}
