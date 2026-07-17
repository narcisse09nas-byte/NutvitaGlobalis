import type {
  AdminAuditEntry,
  AdminStoreData,
  AdminUserRecord,
} from "@/types/admin";

const KEY = "nutvita-admin-store";

function browser() {
  return typeof window !== "undefined";
}

export function emptyAdminStore(): AdminStoreData {
  return {
    version: 1,
    users: [],
    audit: [],
  };
}

export function loadAdminStore(): AdminStoreData {
  if (!browser()) return emptyAdminStore();

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyAdminStore();

    const parsed = JSON.parse(raw) as AdminStoreData;

    return {
      version: 1,
      users: parsed.users ?? [],
      audit: parsed.audit ?? [],
    };
  } catch {
    return emptyAdminStore();
  }
}

export function saveAdminStore(data: AdminStoreData) {
  if (!browser()) return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function createAdminUser(
  input: Omit<AdminUserRecord, "id" | "createdAt">
): AdminUserRecord {
  return {
    ...input,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `admin-user-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}

export function createAuditEntry(
  input: Omit<AdminAuditEntry, "id" | "createdAt">
): AdminAuditEntry {
  return {
    ...input,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `audit-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}
