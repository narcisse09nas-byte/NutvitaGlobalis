"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { dashboardNavigation } from "@/config/dashboard-navigation";
import { canAccessDashboardPath } from "@/config/dashboard-access";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { navigationMessageKeys } from "@/config/navigation-i18n";

type DashboardSidebarProps = {
  onNavigate?: () => void;
};

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useLocalAuth();
  const { t } = useLanguage();
  const translate = (value: string) =>
    navigationMessageKeys[value] ? t(navigationMessageKeys[value]) : value;
  const visibleNavigation = user
    ? dashboardNavigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            canAccessDashboardPath(user.role, item.href),
          ),
        }))
        .filter((section) => section.items.length > 0)
    : [];

  return (
    <aside className="flex h-screen w-72 flex-col overflow-hidden bg-[#063D2E] text-white">
      <div className="shrink-0 border-b border-white/10 px-6 py-6">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <p className="text-xl font-extrabold leading-none">
            NutVita
            <span className="text-[#F58220]">Globalis</span>
          </p>

          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.3em] text-green-100">
            Academy
          </p>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-7">
          {visibleNavigation.map((section) => (
            <section key={section.title}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-green-200/70">
                {translate(section.title)}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                        isActive
                          ? "border-[#F3C969] !bg-[#FFF1B8] !text-[#063D2E] shadow-[inset_3px_0_0_#F58220,0_4px_12px_rgba(0,0,0,0.08)]"
                          : "border-transparent text-green-50 hover:border-white/10 hover:bg-white/10",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon size={19} className="shrink-0" />

                        <span className="truncate">
                          {translate(item.label)}
                        </span>
                      </span>

                      {item.badge && (
                        <span
                          className={cn(
                            "ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                            isActive
                              ? "bg-[#F58220] text-white"
                              : "bg-[#F58220] text-white",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
