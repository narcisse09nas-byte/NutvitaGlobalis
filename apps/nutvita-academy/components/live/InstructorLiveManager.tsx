"use client";

import Link from "next/link";

import {
  CalendarPlus,
  Radio,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";

import {
  formatSessionDate,
} from "@/lib/live-session-utils";
import { useLanguage } from "@/hooks/use-language";

export function InstructorLiveManager() {
  const { locale, text } = useLanguage();
  const {
    sessions,
    updateStatus,
  } = useLiveSessions();

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <Link
          href="/dashboard/live/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          <CalendarPlus size={18} />
          {text("Nouvelle session", "New session")}
        </Link>
      </div>

      <div className="space-y-4">
        {sessions.map(
          (session) => (
            <article
              key={session.id}
              className="rounded-[24px] border border-green-100 bg-white p-6"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#F58220]">
                    {
                      session.provider
                    }
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-[#063D2E]">
                    {session.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {formatSessionDate(
                      session.startAt,
                      locale,
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={
                      session.status
                    }
                    onChange={(event) =>
                      updateStatus(
                        session.id,
                        event.target
                          .value as typeof session.status
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="scheduled">
                      {text("Planifiée", "Scheduled")}
                    </option>

                    <option value="live">
                      {text("En direct", "Live")}
                    </option>

                    <option value="completed">
                      {text("Terminée", "Completed")}
                    </option>

                    <option value="cancelled">
                      {text("Annulée", "Cancelled")}
                    </option>
                  </select>

                  <Link
                    href={`/dashboard/live/${session.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-2.5 text-sm font-bold text-white"
                  >
                    <Radio size={17} />
                    {text("Ouvrir", "Open")}
                  </Link>
                </div>
              </div>
            </article>
          )
        )}

        {sessions.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-10 text-center text-slate-500">
            {text("Aucune session créée.", "No session created.")}
          </div>
        )}
      </div>
    </div>
  );
}
