export type LocalUserRole = "student" | "instructor" | "admin" | "super_admin";
export type WorkspaceMode = "super_admin" | "instructor" | "student";

export type LocalUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profession?: string;
  country?: string;
  legalName?: string;
  dateOfBirth?: string;
  nationality?: string;
  role: LocalUserRole;
  active: boolean;
  password: string;
  createdAt: string;
};

export type LocalSession = {
  userId: string;
  loggedInAt: string;
};
