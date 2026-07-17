import type {
  LiveProvider,
  LiveSession,
} from "@/types/live-session";

export const liveProviderLabels: Record<
  LiveProvider,
  string
> = {
  jitsi: "Jitsi",
  zoom: "Zoom",
  google_meet: "Google Meet",
  external: "Lien externe",
};

export function getLiveSessionJoinUrl(
  session: LiveSession
): string | null {
  if (session.provider === "jitsi") {
    if (!session.roomName) {
      return null;
    }

    return `https://meet.jit.si/${encodeURIComponent(
      session.roomName
    )}`;
  }

  return session.externalUrl ?? null;
}

export function getLiveSessionState(
  session: LiveSession
): "upcoming" | "open" | "past" {
  const now = Date.now();
  const start =
    new Date(
      session.startAt
    ).getTime();
  const end =
    new Date(
      session.endAt
    ).getTime();

  if (now < start) {
    return "upcoming";
  }

  if (now >= start && now <= end) {
    return "open";
  }

  return "past";
}

export function formatSessionDate(
  value: string,
  locale: "fr" | "en" = "fr",
): string {
  return new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      dateStyle: "full",
      timeStyle: "short",
    }
  ).format(new Date(value));
}
