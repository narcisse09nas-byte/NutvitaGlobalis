"use client";

import Link from "next/link";

import { CalendarPlus } from "lucide-react";

import { LiveSessionList } from "@/components/live/LiveSessionList";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

export default function LiveSessionsPage() {
  const { user } = useLocalAuth();
  const { text } = useLanguage();
  const canPlan =
    user && ["instructor", "admin", "super_admin"].includes(user.role);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
            {text("Classes virtuelles", "Virtual classes")}
          </p>

          <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
            {text("Sessions en direct", "Live sessions")}
          </h1>

          <p className="mt-3 max-w-3xl text-slate-600">
            {text(
              "Rejoignez les webinaires, classes virtuelles et séances d’accompagnement.",
              "Join webinars, virtual classes and coaching sessions.",
            )}
          </p>
        </div>

        {canPlan && (
          <Link
            href="/dashboard/live/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
          >
            <CalendarPlus size={18} />
            {text("Planifier", "Schedule")}
          </Link>
        )}
      </div>

      <div className="mt-8">
        <LiveSessionList />
      </div>
    </div>
  );
}
