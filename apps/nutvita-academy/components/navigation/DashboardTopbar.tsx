"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Menu, Search, UserCircle } from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/hooks/use-language";

type DashboardTopbarProps = {
  onOpenMenu: () => void;
};

export function DashboardTopbar({ onOpenMenu }: DashboardTopbarProps) {
  const { user, accountRole } = useLocalAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-[76px] min-w-0 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-[#063D2E] lg:hidden"
            aria-label="Ouvrir la navigation"
          >
            <Menu size={22} />
          </button>

          <div className="hidden sm:block">
            <p className="text-xs text-slate-500">NutVitaGlobalis Academy</p>

            <p className="font-extrabold text-[#063D2E]">
              {pathname.startsWith("/dashboard/admin")
                ? t("adminSpace")
                : pathname.startsWith("/dashboard/instructor") ||
                    pathname === "/dashboard/ai-pro"
                  ? t("instructorSpace")
                  : t("learnerSpace")}
            </p>
          </div>
        </div>

        <div className="mx-auto hidden min-w-0 max-w-xl flex-1 px-4 md:block">
          <label className="relative block">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              placeholder={t("search")}
              className="h-11 w-full rounded-full border border-slate-200 bg-[#F8FAFC] pl-11 pr-4 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/choisir-acces"
            className="hidden rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-[#063D2E] 2xl:inline-flex"
          >
            Changer de service
          </a>
          {accountRole === "super_admin" && (
            <Link
              href="/session-select"
              className="hidden rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-[#063D2E] xl:inline-flex"
            >
              {t("changeSpace")}
            </Link>
          )}
          <LanguageSwitcher compact />
          <NotificationBell />

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 sm:pr-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
              <UserCircle size={23} />
            </span>

            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-36 truncate text-sm font-bold text-[#063D2E]">
                {user?.fullName ?? "Utilisateur"}
              </span>

              {user && (
                <span className="mt-1 block">
                  <RoleBadge
                    role={user.role}
                    className="px-2 py-0.5 text-[10px]"
                  />
                </span>
              )}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
