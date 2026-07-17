import type { ReactNode } from "react";
import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <LocalRoleGuard allowedRoles={["admin", "super_admin"]}>
      {children}
    </LocalRoleGuard>
  );
}
