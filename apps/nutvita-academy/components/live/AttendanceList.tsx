"use client";

import { useMemo } from "react";

import {
  Clock3,
  Users,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";
import { useLanguage } from "@/hooks/use-language";

export function AttendanceList({
  sessionId,
}: {
  sessionId: string;
}) {
  const { text } = useLanguage();
  const { data } =
    useLiveSessions();

  const attendance =
    useMemo(
      () =>
        data.attendance.filter(
          (item) =>
            item.sessionId ===
            sessionId
        ),
      [
        data.attendance,
        sessionId,
      ]
    );

  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-6">
      <div className="flex items-center gap-3">
        <Users className="text-[#0B5D3B]" />

        <h2 className="text-xl font-extrabold text-[#063D2E]">
          {text("Présence", "Attendance")}
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {attendance.map(
          (item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-[#F8FAFC] p-4"
            >
              <p className="font-bold text-[#063D2E]">
                {item.fullName}
              </p>

              <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                <Clock3 size={14} />
                {Math.floor(
                  item.durationSeconds /
                    60
                )}{" "}
                min
              </p>
            </article>
          )
        )}

        {attendance.length === 0 && (
          <p className="text-sm text-slate-500">
            {text("Aucun participant enregistré.", "No registered participants.")}
          </p>
        )}
      </div>
    </section>
  );
}
