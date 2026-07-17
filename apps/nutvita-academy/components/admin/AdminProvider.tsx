"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import {
  createLocalUserByAdmin,
  getLocalUsers,
  updateLocalUser,
} from "@/lib/local-auth";
import {
  createAuditEntry,
  emptyAdminStore,
  loadAdminStore,
  saveAdminStore,
} from "@/lib/admin-storage";
import type { AcademyRole, AdminStoreData, AdminUserRecord } from "@/types/admin";
import type { LocalUser } from "@/types/local-auth";

function toAdminUser(user: LocalUser): AdminUserRecord {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

type AdminContextValue = {
  data: AdminStoreData;
  addUser: (input: {
    fullName: string;
    email: string;
    password: string;
    role: AcademyRole;
  }) => { success: boolean; error?: string };
  updateRole: (userId: string, role: AcademyRole) => void;
  toggleActive: (userId: string) => void;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useLocalAuth();
  const [data, setData] = useState<AdminStoreData>(emptyAdminStore());

  useEffect(() => {
    const stored = loadAdminStore();
    setData({ ...stored, users: getLocalUsers().map(toAdminUser) });
  }, []);

  const audit = useCallback(
    (action: string, entityId?: string, details?: string) => {
      setData((current) => {
        const updated = {
          ...current,
          users: getLocalUsers().map(toAdminUser),
          audit: [
            createAuditEntry({
              actorUserId: user?.id ?? "local-admin",
              action,
              entityType: "user",
              entityId,
              details,
            }),
            ...current.audit,
          ],
        };
        saveAdminStore(updated);
        return updated;
      });
    },
    [user?.id]
  );

  const addUser = useCallback(
    (input: { fullName: string; email: string; password: string; role: AcademyRole }) => {
      const result = createLocalUserByAdmin(input);
      if (!result.user) return { success: false, error: result.error };
      audit("CREATE_USER", result.user.id, `${result.user.email} · ${result.user.role}`);
      return { success: true };
    },
    [audit]
  );

  const updateRole = useCallback(
    (userId: string, role: AcademyRole) => {
      const updated = updateLocalUser(userId, { role });
      if (!updated) return;
      audit("UPDATE_ROLE", userId, updated.role);
      if (user?.id === userId) refreshUser();
    },
    [audit, refreshUser, user?.id]
  );

  const toggleActive = useCallback(
    (userId: string) => {
      const current = getLocalUsers().find((item) => item.id === userId);
      if (!current) return;
      const updated = updateLocalUser(userId, { active: !current.active });
      if (!updated) return;
      audit("TOGGLE_USER_STATUS", userId, updated.active ? "active" : "inactive");
      if (user?.id === userId) refreshUser();
    },
    [audit, refreshUser, user?.id]
  );

  const value = useMemo(
    () => ({ data, addUser, updateRole, toggleActive }),
    [data, addUser, updateRole, toggleActive]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
