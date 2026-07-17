"use client";

import {
  useEffect,
} from "react";

import { useLiveSessions } from "@/hooks/use-live-sessions";

export function JitsiRoom({
  sessionId,
  roomName,
}: {
  sessionId: string;
  roomName: string;
}) {
  const {
    joinSession,
    leaveSession,
  } = useLiveSessions();

  useEffect(() => {
    joinSession(
      sessionId
    );

    return () => {
      leaveSession(
        sessionId
      );
    };
  }, [
    joinSession,
    leaveSession,
    sessionId,
  ]);

  const url =
    `https://meet.jit.si/${encodeURIComponent(
      roomName
    )}#config.prejoinPageEnabled=true`;

  return (
    <iframe
      src={url}
      title="Salle Jitsi"
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      className="h-[70vh] min-h-[560px] w-full rounded-[24px] border border-green-100 bg-black"
    />
  );
}
