import type { LocalUserRole } from "@/types/local-auth";

export type AcademyRole = LocalUserRole;

export type AdminUserRecord = {
  id: string;
  fullName: string;
  email: string;
  role: AcademyRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

export type AdminAuditEntry = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
};

export type AdminStoreData = {
  version: 1;
  users: AdminUserRecord[];
  audit: AdminAuditEntry[];
};
