"use client";

import { Bell } from "lucide-react";

import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useLanguage } from "@/hooks/use-language";

export default function NotificationsPage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
          <Bell size={28} />
        </div>

        <p className="mt-6 font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Activité", "Activity")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("Centre de notifications", "Notification center")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Consultez vos rappels, résultats, récompenses et alertes de certification.",
            "Review your reminders, results, rewards and certification alerts.",
          )}
        </p>
      </header>

      <div className="mt-10">
        <NotificationCenter />
      </div>
    </div>
  );
}
