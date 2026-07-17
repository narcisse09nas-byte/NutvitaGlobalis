import type { LocalSession, LocalUser, LocalUserRole } from "@/types/local-auth";

const USERS_KEY = "nutvita-local-users";
const SESSION_KEY = "nutvita-local-session";

export const LOCAL_SUPER_ADMIN_EMAILS = [
  "pauln.zebaze@gmail.com",
  "contact@nutvitaglobalis.com",
] as const;

export const LOCAL_SUPER_ADMIN_DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_LOCAL_SUPER_ADMIN_PASSWORD || "";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isLocalSuperAdminEmail(email: string) {
  return LOCAL_SUPER_ADMIN_EMAILS.includes(
    normalizeEmail(email) as (typeof LOCAL_SUPER_ADMIN_EMAILS)[number]
  );
}

export function getLocalUsers(): LocalUser[] {
  if (!isBrowser()) return [];

  try {
    const storedUsers = localStorage.getItem(USERS_KEY);
    if (!storedUsers) return [];

    return (JSON.parse(storedUsers) as LocalUser[]).map((user) => ({
      ...user,
      email: normalizeEmail(user.email),
      active: user.active ?? true,
      role: isLocalSuperAdminEmail(user.email) ? "super_admin" : user.role,
    }));
  } catch {
    return [];
  }
}

export function saveLocalUsers(users: LocalUser[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function ensureLocalSuperAdmins() {
  if (!isBrowser()) return [];

  const users = getLocalUsers();
  let changed = false;

  for (const email of LOCAL_SUPER_ADMIN_EMAILS) {
    const existing = users.find((user) => user.email === email);
    if (existing) {
      if (existing.role !== "super_admin" || !existing.active) {
        existing.role = "super_admin";
        existing.active = true;
        changed = true;
      }
      continue;
    }

    if (!LOCAL_SUPER_ADMIN_DEFAULT_PASSWORD) continue;
    users.push({
      id: createId(),
      fullName: email.startsWith("pauln.") ? "Paul Narcisse Zebaze" : "NutVitaGlobalis",
      email,
      role: "super_admin",
      active: true,
      password: LOCAL_SUPER_ADMIN_DEFAULT_PASSWORD,
      createdAt: new Date().toISOString(),
    });
    changed = true;
  }

  if (changed) saveLocalUsers(users);
  return users;
}

export function registerLocalUser(
  userData: Omit<LocalUser, "id" | "createdAt" | "role" | "active">
): { user?: LocalUser; error?: string } {
  const users = ensureLocalSuperAdmins();
  const email = normalizeEmail(userData.email);

  if (users.some((user) => user.email === email)) {
    return { error: "Un compte existe déjà avec cette adresse email." };
  }

  const newUser: LocalUser = {
    ...userData,
    id: createId(),
    email,
    role: "student",
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveLocalUsers([...users, newUser]);
  return { user: newUser };
}

export function createLocalUserByAdmin(input: {
  fullName: string;
  email: string;
  password: string;
  role: LocalUserRole;
}): { user?: LocalUser; error?: string } {
  const users = ensureLocalSuperAdmins();
  const email = normalizeEmail(input.email);

  if (users.some((user) => user.email === email)) {
    return { error: "Un compte existe déjà avec cette adresse email." };
  }
  if (input.password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const user: LocalUser = {
    id: createId(),
    fullName: input.fullName.trim(),
    email,
    password: input.password,
    role: isLocalSuperAdminEmail(email) ? "super_admin" : input.role,
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveLocalUsers([...users, user]);
  return { user };
}

export function loginLocalUser(email: string, password: string) {
  const users = ensureLocalSuperAdmins();
  const user = users.find(
    (item) => item.email === normalizeEmail(email) && item.password === password
  );

  if (!user) return { error: "Adresse email ou mot de passe incorrect." };
  if (!user.active) return { error: "Ce compte a été désactivé." };

  createLocalSession(user.id);
  return { user };
}

export function createLocalSession(userId: string) {
  if (!isBrowser()) return;
  const session: LocalSession = { userId, loggedInAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getLocalSession(): LocalSession | null {
  if (!isBrowser()) return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? (JSON.parse(stored) as LocalSession) : null;
  } catch {
    return null;
  }
}

export function getCurrentLocalUser(): LocalUser | null {
  const session = getLocalSession();
  if (!session) return null;
  const user = getLocalUsers().find((item) => item.id === session.userId) ?? null;
  return user?.active ? user : null;
}

export function logoutLocalUser() {
  if (isBrowser()) localStorage.removeItem(SESSION_KEY);
}

export function updateLocalUser(
  userId: string,
  updates: Partial<Omit<LocalUser, "id" | "createdAt">>
): LocalUser | null {
  const users = ensureLocalSuperAdmins();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  const current = users[index];
  const protectedAccount = isLocalSuperAdminEmail(current.email);
  const updated: LocalUser = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    email: normalizeEmail(updates.email ?? current.email),
    role: protectedAccount ? "super_admin" : (updates.role ?? current.role),
    active: protectedAccount ? true : (updates.active ?? current.active),
  };
  users[index] = updated;
  saveLocalUsers(users);
  return updated;
}
