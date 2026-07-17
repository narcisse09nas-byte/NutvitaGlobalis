"use client";

import {
  ExternalLink,
  Video,
} from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";
import { useLanguage } from "@/hooks/use-language";

export function ExternalMeetingPanel({
  sessionId,
  url,
}: {
  sessionId: string;
  url: string;
}) {
  const { text } = useLanguage();
  const {
    joinSession,
  } = useLiveSessions();

  return (
    <div className="rounded-[28px] border border-green-100 bg-white p-10 text-center">
      <Video
        size={48}
        className="mx-auto text-[#0B5D3B]"
      />

      <h2 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
        {text("Réunion externe", "External meeting")}
      </h2>

      <p className="mt-3 text-slate-600">
        {text("La session s’ouvrira dans un nouvel onglet.", "The session will open in a new tab.")}
      </p>

      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={() =>
          joinSession(
            sessionId
          )
        }
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
      >
        <ExternalLink
          size={19}
        />
        {text("Rejoindre la réunion", "Join meeting")}
      </a>
    </div>
  );
}
