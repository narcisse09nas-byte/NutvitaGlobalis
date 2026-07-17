import type { ReactNode } from "react";
import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";

export default function InstructorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LocalRoleGuard allowedRoles={["instructor", "admin", "super_admin"]}>
      {children}
    </LocalRoleGuard>
  );
}
