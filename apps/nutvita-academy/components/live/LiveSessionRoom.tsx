"use client";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  UserRound,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

import {
  formatSessionDate,
  getLiveSessionJoinUrl,
} from "@/lib/live-session-utils";

import { AttendanceList } from "@/components/live/AttendanceList";
import { ExternalMeetingPanel } from "@/components/live/ExternalMeetingPanel";
import { JitsiRoom } from "@/components/live/JitsiRoom";
import { LiveChat } from "@/components/live/LiveChat";

export function LiveSessionRoom({
  sessionId,
}: {
  sessionId: string;
}) {
  const { locale, text } = useLanguage();
  const {
    getSessionById,
    isRegistered,
  } = useLiveSessions();
  const { user } = useLocalAuth();

  const session =
    getSessionById(
      sessionId
    );

  if (!session) {
    return (
      <div className="rounded-[24px] bg-white p-8">
        {text("Session introuvable.", "Session not found.")}
      </div>
    );
  }

  const canManage = user && (session.instructorUserId === user.id || user.role === "admin" || user.role === "super_admin");
  if (!isRegistered(session.id) && !canManage) {
    return <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-8 text-center"><h1 className="text-2xl font-extrabold text-[#063D2E]">{text("Inscription requise", "Registration required")}</h1><p className="mt-3 text-slate-600">{text("Inscrivez-vous depuis la liste des classes virtuelles avant d’ouvrir cette salle.", "Register from the virtual classes list before opening this room.")}</p><Link href="/dashboard/live" className="mt-5 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white">{text("Voir les sessions", "View sessions")}</Link></div>;
  }

  const url =
    getLiveSessionJoinUrl(
      session
    );

  return (
    <div>
      <Link
        href="/dashboard/live"
        className="inline-flex items-center gap-2 font-bold text-[#0B5D3B]"
      >
        <ArrowLeft size={18} />
        {text("Retour aux sessions", "Back to sessions")}
      </Link>

      <header className="mt-6 rounded-[28px] border border-green-100 bg-white p-7">
        <h1 className="text-3xl font-extrabold text-[#063D2E]">
          {session.title}
        </h1>

        <p className="mt-3 text-slate-600">
          {
            session.description
          }
        </p>

        <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={17} />
            {formatSessionDate(
              session.startAt,
              locale,
            )}
          </span>

          <span className="inline-flex items-center gap-2">
            <Clock3 size={17} />
            {session.timezone}
          </span>

          <span className="inline-flex items-center gap-2">
            <UserRound size={17} />
            {
              session.instructorName
            }
          </span>
        </div>
      </header>

      <div className="mt-8 grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {session.provider ===
            "jitsi" &&
          session.roomName ? (
            <JitsiRoom
              sessionId={
                session.id
              }
              roomName={
                session.roomName
              }
            />
          ) : url ? (
            <ExternalMeetingPanel
              sessionId={
                session.id
              }
              url={url}
            />
          ) : (
            <div className="rounded-[24px] bg-red-50 p-8 text-red-700">
              {text("Aucun lien de réunion configuré.", "No meeting link configured.")}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <LiveChat
            sessionId={
              session.id
            }
          />

          <AttendanceList
            sessionId={
              session.id
            }
          />
        </div>
      </div>
    </div>
  );
}
