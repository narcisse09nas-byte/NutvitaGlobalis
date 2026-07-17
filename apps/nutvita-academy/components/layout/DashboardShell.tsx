"use client";

import type { ReactNode } from "react";

import { useMobileMenu } from "@/hooks/use-mobile-menu";
import { DashboardSidebar } from "@/components/navigation/DashboardSidebar";
import { DashboardTopbar } from "@/components/navigation/DashboardTopbar";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({
  children,
}: DashboardShellProps) {
  const mobileMenu = useMobileMenu();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC]">
      {/* Barre latérale ordinateur */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <DashboardSidebar />
      </div>

      {/* Navigation mobile */}
      <MobileNavigation
        isOpen={mobileMenu.isOpen}
        onClose={mobileMenu.closeMenu}
      />

      {/* Toute la zone à droite de la barre latérale */}
      <div className="min-h-screen min-w-0 lg:ml-72">
        <DashboardTopbar
          onOpenMenu={mobileMenu.openMenu}
        />

        <main className="min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}