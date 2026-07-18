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

export function createWeeklyOccurrences(slot: Omit<ProctoringStore["slots"][number], "id" | "createdAt" | "updatedAt">, weeks = 26) {
  const first = new Date(slot.startsAt);
  const group = slot.recurrenceGroupId ?? proctoringId("weekly-slot");
  const now = new Date().toISOString();
  return Array.from({ length: weeks }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index * 7);
    return { ...slot, id: `${group}-${date.toISOString().slice(0, 10)}`, recurrenceGroupId: group, startsAt: date.toISOString(), createdAt: now, updatedAt: now };
  });
}

function replenishWeeklySlots(store: ProctoringStore) {
  const templates = new Map<string, ProctoringStore["slots"][number]>();
  store.slots.forEach((slot) => { if (slot.recurrenceGroupId) templates.set(slot.recurrenceGroupId, slot); });
  const existing = new Set(store.slots.map((slot) => slot.id));
  const additions = [...templates.values()].flatMap((template) => {
    const weekday = template.recurrenceWeekday ?? new Date(template.startsAt).getDay();
    const [hours, minutes] = (template.recurrenceTime ?? "09:00").split(":").map(Number);
    const first = new Date(); first.setHours(hours, minutes, 0, 0);
    first.setDate(first.getDate() + ((weekday - first.getDay() + 7) % 7 || (first <= new Date() ? 7 : 0)));
    return createWeeklyOccurrences({ ...template, startsAt: first.toISOString(), recurrenceGroupId: template.recurrenceGroupId }, 26).filter((slot) => !existing.has(slot.id));
  });
  return additions.length ? { ...store, slots: [...store.slots.filter((slot) => new Date(slot.startsAt).getTime() > Date.now() - 86400000), ...additions] } : store;
}
export function loadProctoringStore(): ProctoringStore {
  if (typeof window === "undefined") return emptyProctoringStore();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ProctoringStore> | null;
    if (!parsed) return emptyProctoringStore();
    return replenishWeeklySlots({
      ...emptyProctoringStore(),
      ...parsed,
      policy: { ...defaultProctoringPolicy, ...parsed.policy },
      version: 2,
    });
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
