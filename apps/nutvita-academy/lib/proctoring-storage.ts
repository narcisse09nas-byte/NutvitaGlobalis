import type { ProctoringStore } from "@/types/proctoring";

const KEY = "nutvita-proctoring-v1";

export const defaultProctoringPolicy = {
  minimumLeadDays: 7,
  maximumCandidates: 10,
  identityThreshold: 85,
  requireCamera: true,
  requireMicrophone: true,
  requireScreenShare: true,
  requireFullscreen: true,
  autoEjectOnCriticalCount: 2,
} as const;

export function emptyProctoringStore(): ProctoringStore {
  return {
    version: 2,
    policy: { ...defaultProctoringPolicy },
    slots: [],
    bookings: [],
    roomStatuses: {},
    admissions: [],
    incidents: [],
  };
}

export function loadProctoringStore(): ProctoringStore {
  if (typeof window === "undefined") return emptyProctoringStore();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ProctoringStore> | null;
    if (!parsed) return emptyProctoringStore();
    return {
      ...emptyProctoringStore(),
      ...parsed,
      policy: { ...defaultProctoringPolicy, ...parsed.policy },
      version: 2,
    };
  } catch {
    return emptyProctoringStore();
  }
}

export function saveProctoringStore(store: ProctoringStore) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(store));
}

export function proctoringId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function createRoomCode() {
  return `NVGA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function minimumSlotDate(leadDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + leadDays);
  date.setSeconds(0, 0);
  return date;
}

export function countSlotBookings(store: ProctoringStore, slotId: string) {
  return store.bookings.filter((booking) => booking.slotId === slotId && booking.status !== "rejected" && booking.status !== "cancelled").length;
}
