"use client";

import {
  CalendarX2,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";
import { useLanguage } from "@/hooks/use-language";

import { LiveSessionCard } from "@/components/live/LiveSessionCard";

export function LiveSessionList() {
  const { text } = useLanguage();
  const { sessions } =
    useLiveSessions();

  if (sessions.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
        <CalendarX2
          size={44}
          className="mx-auto text-[#0B5D3B]"
        />

        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {text("Aucune session planifiée", "No sessions scheduled")}
        </h2>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map(
        (session) => (
          <LiveSessionCard
            key={session.id}
            session={session}
          />
        )
      )}
    </div>
  );
}
