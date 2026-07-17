"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import {
  createLocalSession,
  ensureLocalSuperAdmins,
  getCurrentLocalUser,
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser,
  updateLocalUser,
} from "@/lib/local-auth";
import type {
  LocalUser,
  LocalUserRole,
  WorkspaceMode,
} from "@/types/local-auth";
import { useLanguage } from "@/hooks/use-language";

type RegisterData = {
  fullName: string;
  email: string;
  phone?: string;
  profession?: string;
  country?: string;
  password: string;
};
type AuthResult = {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
  requiresWorkspaceSelection?: boolean;
};
type ProfileUpdate = {
  fullName: string;
  phone?: string;
  profession?: string;
  country?: string;
  legalName?: string;
  dateOfBirth?: string;
  nationality?: string;
};
type ContextValue = {
  user: LocalUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: "supabase" | "local";
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<AuthResult>;
  accountRole: LocalUserRole | null;
  workspaceMode: WorkspaceMode | null;
  requiresWorkspaceSelection: boolean;
  selectWorkspace: (mode: WorkspaceMode) => void;
};

export const LocalAuthContext = createContext<ContextValue | null>(null);

const WORKSPACE_KEY = "nutvita-super-admin-workspace";

function readWorkspaceMode(): WorkspaceMode | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(WORKSPACE_KEY);
  return ["super_admin", "instructor", "student"].includes(value ?? "")
    ? (value as WorkspaceMode)
    : null;
}

function normalizeRole(value: unknown): LocalUserRole {
  return ["student", "instructor", "admin", "super_admin"].includes(
    String(value),
  )
    ? (value as LocalUserRole)
    : "student";
}

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const { text } = useLanguage();
  const remote = isSupabaseConfigured();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadSupabaseUser = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setUser(null);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, email, role, created_at, legal_name, date_of_birth, nationality, country",
      )
      .eq("id", auth.user.id)
      .maybeSingle();
    const loadedUser: LocalUser = {
      id: auth.user.id,
      fullName:
        profile?.full_name ??
        auth.user.user_metadata.full_name ??
        auth.user.email?.split("@")[0] ??
        "Utilisateur",
      email: profile?.email ?? auth.user.email ?? "",
      role: normalizeRole(profile?.role),
      active: true,
      password: "",
      createdAt: profile?.created_at ?? auth.user.created_at,
      legalName: profile?.legal_name ?? undefined,
      dateOfBirth: profile?.date_of_birth ?? undefined,
      nationality: profile?.nationality ?? undefined,
      country: profile?.country ?? auth.user.user_metadata.country ?? undefined,
    };
    setUser(loadedUser);
    setWorkspaceMode(
      loadedUser.role === "super_admin" ? readWorkspaceMode() : null,
    );
    return loadedUser;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (remote) await loadSupabaseUser();
      else {
        ensureLocalSuperAdmins();
        const localUser = getCurrentLocalUser();
        setUser(localUser);
        setWorkspaceMode(
          localUser?.role === "super_admin" ? readWorkspaceMode() : null,
        );
      }
      if (active) setIsLoading(false);
    })();
    if (!remote)
      return () => {
        active = false;
      };
    const supabase = createSupabaseBrowserClient();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void loadSupabaseUser();
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadSupabaseUser, remote]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      window.sessionStorage.removeItem(WORKSPACE_KEY);
      setWorkspaceMode(null);
      if (remote) {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { success: false, error: error.message };
        const loadedUser = await loadSupabaseUser();
        return {
          success: true,
          requiresWorkspaceSelection: loadedUser?.role === "super_admin",
        };
      }
      const result = loginLocalUser(email, password);
      if (!result.user) return { success: false, error: result.error };
      setUser(result.user);
      return {
        success: true,
        requiresWorkspaceSelection: result.user.role === "super_admin",
      };
    },
    [loadSupabaseUser, remote],
  );

  const register = useCallback(
    async (data: RegisterData): Promise<AuthResult> => {
      if (remote) {
        const supabase = createSupabaseBrowserClient();
        const { data: auth, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: data.phone ?? "",
              profession: data.profession ?? "",
              country: data.country ?? "",
            },
          },
        });
        if (error) return { success: false, error: error.message };
        if (!auth.session)
          return { success: true, requiresEmailConfirmation: true };
        await loadSupabaseUser();
        return { success: true };
      }
      const result = registerLocalUser({
        ...data,
        phone: data.phone ?? "",
        profession: data.profession ?? "",
        country: data.country ?? "",
      });
      if (!result.user) return { success: false, error: result.error };
      createLocalSession(result.user.id);
      setUser(result.user);
      return { success: true };
    },
    [loadSupabaseUser, remote],
  );

  const logout = useCallback(async () => {
    if (remote) await createSupabaseBrowserClient().auth.signOut();
    else logoutLocalUser();
    setUser(null);
    window.sessionStorage.removeItem(WORKSPACE_KEY);
    setWorkspaceMode(null);
  }, [remote]);

  const refreshUser = useCallback(async () => {
    if (remote) await loadSupabaseUser();
    else setUser(getCurrentLocalUser());
  }, [loadSupabaseUser, remote]);

  const updateProfile = useCallback(
    async (data: ProfileUpdate): Promise<AuthResult> => {
      if (!user)
        return {
          success: false,
          error: text("Votre session a expiré.", "Your session has expired."),
        };
      if (remote) {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: data.fullName,
            legal_name: data.legalName || null,
            date_of_birth: data.dateOfBirth || null,
            nationality: data.nationality || null,
            country: data.country || null,
          })
          .eq("id", user.id);
        if (error) return { success: false, error: error.message };
        await loadSupabaseUser();
        return { success: true };
      }
      const updated = updateLocalUser(user.id, data);
      if (!updated)
        return {
          success: false,
          error: text(
            "Le profil n’a pas pu être mis à jour.",
            "The profile could not be updated.",
          ),
        };
      setUser(updated);
      return { success: true };
    },
    [loadSupabaseUser, remote, text, user],
  );

  const selectWorkspace = useCallback(
    (mode: WorkspaceMode) => {
      if (user?.role !== "super_admin") return;
      window.sessionStorage.setItem(WORKSPACE_KEY, mode);
      setWorkspaceMode(mode);
    },
    [user?.role],
  );

  const requiresWorkspaceSelection =
    user?.role === "super_admin" && !workspaceMode;
  const sessionUser = useMemo(
    () =>
      user && user.role === "super_admin" && workspaceMode
        ? { ...user, role: workspaceMode as LocalUserRole }
        : user,
    [user, workspaceMode],
  );

  const value = useMemo(
    () => ({
      user: sessionUser,
      isLoading,
      isAuthenticated: Boolean(user),
      mode: remote ? ("supabase" as const) : ("local" as const),
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      accountRole: user?.role ?? null,
      workspaceMode,
      requiresWorkspaceSelection,
      selectWorkspace,
    }),
    [
      isLoading,
      login,
      logout,
      refreshUser,
      register,
      remote,
      updateProfile,
      user,
      sessionUser,
      workspaceMode,
      requiresWorkspaceSelection,
      selectWorkspace,
    ],
  );
  return (
    <LocalAuthContext.Provider value={value}>
      {children}
    </LocalAuthContext.Provider>
  );
}
