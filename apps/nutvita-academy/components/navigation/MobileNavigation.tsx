"use client";

import { X } from "lucide-react";

import { DashboardSidebar } from "@/components/navigation/DashboardSidebar";

type MobileNavigationProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileNavigation({
  isOpen,
  onClose,
}: MobileNavigationProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fermer la navigation"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60"
      />

      <div className="relative h-full w-[86%] max-w-sm shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#063D2E]"
        >
          <X size={20} />
        </button>

        <DashboardSidebar onNavigate={onClose} />
      </div>
    </div>
  );
}