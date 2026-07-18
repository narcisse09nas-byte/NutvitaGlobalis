import type { LocalUserRole } from "@/types/local-auth";

export function canAccessDashboardPath(role: LocalUserRole, href: string) {
  const common = [
    "/dashboard/profile", "/dashboard/notifications", "/dashboard/resources",
    "/dashboard/history",
  ];
  if (common.some((path) => href === path || href.startsWith(`${path}/`))) return true;
  if (role === "admin" || role === "super_admin") return href.startsWith("/dashboard/admin");
  if (role === "instructor") return href.startsWith("/dashboard/instructor") || href === "/dashboard/ai-pro";
  const learnerPrefixes = [
    "/dashboard/courses", "/dashboard/live", "/dashboard/assessments",
    "/dashboard/exams", "/dashboard/rewards", "/dashboard/certificates",
    "/dashboard/marketplace", "/dashboard/cart", "/dashboard/wishlist",
    "/dashboard/orders", "/dashboard/notes",
  ];
  return href === "/dashboard" || learnerPrefixes.some((path) => href === path || href.startsWith(`${path}/`));
}

export function dashboardHomeForRole(role?: LocalUserRole | null) {
  if (role === "admin" || role === "super_admin") return "/dashboard/admin";
  if (role === "instructor") return "/dashboard/instructor";
  return "/dashboard";
}

export function getDashboardSpaceLabel(pathname: string) {
  if (pathname.startsWith("/dashboard/admin")) return "Espace administration";
  if (pathname.startsWith("/dashboard/instructor") || pathname === "/dashboard/ai-pro") {
    return "Espace formateur";
  }
  return "Espace apprenant";
}
