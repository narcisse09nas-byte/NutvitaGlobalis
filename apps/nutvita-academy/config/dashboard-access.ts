import type { LocalUserRole } from "@/types/local-auth";

export function canAccessDashboardPath(role: LocalUserRole, href: string) {
  if (href.startsWith("/dashboard/admin")) {
    return role === "admin" || role === "super_admin";
  }

  if (href.startsWith("/dashboard/instructor") || href === "/dashboard/ai-pro") {
    return role === "instructor" || role === "admin" || role === "super_admin";
  }

  return true;
}

export function getDashboardSpaceLabel(pathname: string) {
  if (pathname.startsWith("/dashboard/admin")) return "Espace administration";
  if (pathname.startsWith("/dashboard/instructor") || pathname === "/dashboard/ai-pro") {
    return "Espace formateur";
  }
  return "Espace apprenant";
}
