import type { LocalUserRole } from "@/types/local-auth";
import { userRoles } from "@/config/user-roles";
import { cn } from "@/lib/utils";

type RoleBadgeProps = {
  role: LocalUserRole;
  className?: string;
};

const roleStyles: Record<LocalUserRole, string> = {
  student: "bg-[#DDF5E8] text-[#0B5D3B]",

  instructor: "bg-sky-100 text-sky-700",

  admin: "bg-orange-100 text-orange-700",

  super_admin: "bg-purple-100 text-purple-700",
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
        roleStyles[role],
        className,
      )}
    >
      {userRoles[role].label}
    </span>
  );
}
