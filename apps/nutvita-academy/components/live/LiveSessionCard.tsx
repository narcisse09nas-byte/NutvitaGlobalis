"use client";

import Link from "next/link";

import {
  CalendarDays,
  Clock3,
  Radio,
  UserRound,
  Video,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";
import { useLanguage } from "@/hooks/use-language";

import {
  formatSessionDate,
  getLiveSessionState,
  liveProviderLabels,
} from "@/lib/live-session-utils";

import type {
  LiveSession,
} from "@/types/live-session";

export function LiveSessionCard({
  session,
}: {
  session: LiveSession;
}) {
  const { locale, text } = useLanguage();
  const {
    data,
    isRegistered,
    registerForSession,
    unregisterFromSession,
  } = useLiveSessions();

  const registered =
    isRegistered(
      session.id
    );
  const registrationCount = data.registrations.filter((registration) => registration.sessionId === session.id).length;
  const isFull = registrationCount >= session.capacity;

  const state =
    getLiveSessionState(
      session
    );

  return (
    <article className="flex h-full flex-col justify-between rounded-[26px] border border-green-100 bg-white p-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
            {
              liveProviderLabels[
                session.provider
              ]
            }
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              state === "open"
                ? "bg-red-100 text-red-700"
                : state === "upcoming"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {state === "open"
              ? text("En direct", "Live")
              : state ===
                  "upcoming"
                ? text("À venir", "Upcoming")
                : text("Terminée", "Completed")}
          </span>
        </div>

        <h2 className="mt-5 text-xl font-extrabold text-[#063D2E]">
          {session.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {
            session.description
          }
        </p>

        <div className="mt-5 space-y-3 text-sm text-slate-500">
          <p className="flex items-center gap-2">
            <CalendarDays size={17} />
            {formatSessionDate(
              session.startAt,
              locale,
            )}
          </p>

          <p className="flex items-center gap-2">
            <Clock3 size={17} />
            {session.timezone}
          </p>

          <p className="flex items-center gap-2">
            <UserRound size={17} />
            {
              session.instructorName
            } · {registrationCount}/{session.capacity} {text("inscrits", "registered")}
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        <Link
          href={`/dashboard/live/${session.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F58220] px-5 py-3 text-sm font-bold text-white"
        >
          {state === "open" ? (
            <Radio size={18} />
          ) : (
            <Video size={18} />
          )}

          {text("Ouvrir la session", "Open session")}
        </Link>

        <button
          type="button"
          disabled={!registered && isFull}
          onClick={() =>
            registered
              ? unregisterFromSession(
                  session.id
                )
              : registerForSession(
                  session.id
                )
          }
          className="w-full rounded-full border border-[#0B5D3B] px-5 py-3 text-sm font-bold text-[#0B5D3B] disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          {registered
            ? text("Annuler mon inscription", "Cancel registration")
            : text("M’inscrire", "Register")}
        </button>
      </div>
    </article>
  );
}
