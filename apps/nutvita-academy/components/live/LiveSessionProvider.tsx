"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useTenant } from "@/hooks/use-tenant";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

import {
  createAttendance,
  createChatMessage,
  createEmptyLiveSessionStore,
  createLiveSessionRecord,
  createRegistration,
  loadLiveSessionStore,
  saveLiveSessionStore,
} from "@/lib/live-session-storage";

import type {
  LiveProvider,
  LiveSession,
  LiveSessionStatus,
  LiveSessionStore,
} from "@/types/live-session";

type CreateSessionInput = {
  title: string;
  description: string;
  provider: LiveProvider;
  roomName?: string;
  externalUrl?: string;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity: number;
  courseSlug?: string;
};

type LiveSessionContextValue = {
  data: LiveSessionStore;
  sessions: LiveSession[];

  createSession: (
    input: CreateSessionInput
  ) => Promise<LiveSession | null>;

  updateStatus: (
    sessionId: string,
    status: LiveSessionStatus
  ) => void;

  registerForSession: (
    sessionId: string
  ) => void;

  unregisterFromSession: (
    sessionId: string
  ) => void;

  isRegistered: (
    sessionId: string
  ) => boolean;

  joinSession: (
    sessionId: string
  ) => void;

  leaveSession: (
    sessionId: string
  ) => void;

  sendMessage: (
    sessionId: string,
    content: string
  ) => void;

  getSessionById: (
    sessionId: string
  ) => LiveSession | null;
};

export const LiveSessionContext =
  createContext<LiveSessionContextValue | null>(
    null
  );

export function LiveSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } =
    useLocalAuth();

  const {
    activeOrganization,
  } = useTenant();

  const [data, setData] =
    useState<LiveSessionStore>(
      createEmptyLiveSessionStore()
    );
  const [remoteMode, setRemoteMode] = useState(false);

  const refreshRemote = useCallback(async () => {
    const response = await fetch("/api/live", { cache: "no-store" });
    if (!response.ok) return false;
    const store = await response.json() as LiveSessionStore;
    setData(store);
    setRemoteMode(true);
    return true;
  }, []);

  useEffect(() => {
    setData(
      loadLiveSessionStore()
    );
    if (!isSupabaseConfigured()) return;
    void refreshRemote();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel("academy-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => { void refreshRemote(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_registrations" }, () => { void refreshRemote(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages" }, () => { void refreshRemote(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refreshRemote]);

  const persist = useCallback(
    (
      updater: (
        current: LiveSessionStore
      ) => LiveSessionStore
    ) => {
      setData((current) => {
        const updated =
          updater(current);

        saveLiveSessionStore(
          updated
        );

        return updated;
      });
    },
    []
  );

  const sessions = useMemo(
    () =>
      [...data.sessions].sort(
        (first, second) =>
          new Date(
            first.startAt
          ).getTime() -
          new Date(
            second.startAt
          ).getTime()
      ),
    [data.sessions]
  );

  const createSession = useCallback(
    async (
      input: CreateSessionInput
    ) => {
      if (!user) {
        return null;
      }

      if (remoteMode) {
        const response = await fetch("/api/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        if (!response.ok) return null;
        const created = await response.json() as { id: string };
        await refreshRemote();
        return data.sessions.find((item) => item.id === created.id) ?? { ...createLiveSessionRecord({ ...input, instructorUserId: user.id, instructorName: user.fullName, status: "scheduled" }), id: created.id };
      }

      const session =
        createLiveSessionRecord({
          ...input,
          organizationId:
            activeOrganization?.id,
          instructorUserId:
            user.id,
          instructorName:
            user.fullName,
          status: "scheduled",
        });

      persist((current) => ({
        ...current,
        sessions: [
          session,
          ...current.sessions,
        ],
      }));

      return session;
    },
    [
      activeOrganization?.id,
      data.sessions,
      persist,
      refreshRemote,
      remoteMode,
      user,
    ]
  );

  const updateStatus =
    useCallback(
      (
        sessionId: string,
        status: LiveSessionStatus
      ) => {
        if (remoteMode) {
          void fetch(`/api/live/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(() => refreshRemote());
          return;
        }
        persist((current) => ({
          ...current,
          sessions:
            current.sessions.map(
              (session) =>
                session.id ===
                sessionId
                  ? {
                      ...session,
                      status,
                      updatedAt:
                        new Date().toISOString(),
                    }
                  : session
            ),
        }));
      },
      [persist, refreshRemote, remoteMode]
    );

  const registerForSession =
    useCallback(
      (
        sessionId: string
      ) => {
        if (!user) {
          return;
        }

        if (remoteMode) {
          void fetch(`/api/live/${sessionId}/register`, { method: "POST" }).then(() => refreshRemote());
          return;
        }

        persist((current) => {
          const exists =
            current.registrations.some(
              (registration) =>
                registration.sessionId ===
                  sessionId &&
                registration.userId ===
                  user.id
            );

          if (exists) {
            return current;
          }

          const session = current.sessions.find((item) => item.id === sessionId);
          const registrationCount = current.registrations.filter((registration) => registration.sessionId === sessionId).length;
          if (!session || registrationCount >= session.capacity) {
            return current;
          }

          return {
            ...current,
            registrations: [
              createRegistration({
                sessionId,
                userId: user.id,
                fullName:
                  user.fullName,
                email: user.email,
              }),
              ...current.registrations,
            ],
          };
        });
      },
      [persist, refreshRemote, remoteMode, user]
    );

  const unregisterFromSession =
    useCallback(
      (
        sessionId: string
      ) => {
        if (!user) {
          return;
        }

        if (remoteMode) {
          void fetch(`/api/live/${sessionId}/register`, { method: "DELETE" }).then(() => refreshRemote());
          return;
        }

        persist((current) => ({
          ...current,
          registrations:
            current.registrations.filter(
              (registration) =>
                !(
                  registration.sessionId ===
                    sessionId &&
                  registration.userId ===
                    user.id
                )
            ),
        }));
      },
      [persist, refreshRemote, remoteMode, user]
    );

  const isRegistered =
    useCallback(
      (
        sessionId: string
      ) =>
        Boolean(
          user &&
            data.registrations.some(
              (registration) =>
                registration.sessionId ===
                  sessionId &&
                registration.userId ===
                  user.id
            )
        ),
      [
        data.registrations,
        user,
      ]
    );

  const joinSession =
    useCallback(
      (
        sessionId: string
      ) => {
        if (!user) {
          return;
        }

        if (remoteMode) {
          void fetch(`/api/live/${sessionId}/attendance`, { method: "POST" }).then(() => refreshRemote());
          return;
        }

        persist((current) => {
          const session = current.sessions.find((item) => item.id === sessionId);
          const registered = current.registrations.some((registration) => registration.sessionId === sessionId && registration.userId === user.id);
          const canManage = session && (session.instructorUserId === user.id || user.role === "admin" || user.role === "super_admin");
          if (!session || (!registered && !canManage)) return current;

          const activeAttendance =
            current.attendance.find(
              (attendance) =>
                attendance.sessionId ===
                  sessionId &&
                attendance.userId ===
                  user.id &&
                !attendance.leftAt
            );

          if (activeAttendance) {
            return current;
          }

          return {
            ...current,
            attendance: [
              createAttendance({
                sessionId,
                userId: user.id,
                fullName:
                  user.fullName,
                joinedAt:
                  new Date().toISOString(),
              }),
              ...current.attendance,
            ],
          };
        });
      },
      [persist, refreshRemote, remoteMode, user]
    );

  const leaveSession =
    useCallback(
      (
        sessionId: string
      ) => {
        if (!user) {
          return;
        }

        if (remoteMode) {
          void fetch(`/api/live/${sessionId}/attendance`, { method: "DELETE" }).then(() => refreshRemote());
          return;
        }

        const leftAt =
          new Date();

        persist((current) => ({
          ...current,
          attendance:
            current.attendance.map(
              (attendance) => {
                if (
                  attendance.sessionId !==
                    sessionId ||
                  attendance.userId !==
                    user.id ||
                  attendance.leftAt
                ) {
                  return attendance;
                }

                const joinedAt =
                  new Date(
                    attendance.joinedAt
                  );

                return {
                  ...attendance,
                  leftAt:
                    leftAt.toISOString(),
                  durationSeconds:
                    Math.max(
                      0,
                      Math.round(
                        (leftAt.getTime() -
                          joinedAt.getTime()) /
                          1000
                      )
                    ),
                };
              }
            ),
        }));
      },
      [persist, refreshRemote, remoteMode, user]
    );

  const sendMessage =
    useCallback(
      (
        sessionId: string,
        content: string
      ) => {
        if (
          !user ||
          !content.trim()
        ) {
          return;
        }

        if (remoteMode) {
          void fetch(`/api/live/${sessionId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }).then(() => refreshRemote());
          return;
        }

        persist((current) => ({
          ...current,
          messages: [
            ...current.messages,
            createChatMessage({
              sessionId,
              userId: user.id,
              authorName:
                user.fullName,
              content:
                content.trim(),
            }),
          ],
        }));
      },
      [persist, refreshRemote, remoteMode, user]
    );

  const getSessionById =
    useCallback(
      (
        sessionId: string
      ) =>
        data.sessions.find(
          (session) =>
            session.id ===
            sessionId
        ) ?? null,
      [data.sessions]
    );

  const value = useMemo(
    () => ({
      data,
      sessions,
      createSession,
      updateStatus,
      registerForSession,
      unregisterFromSession,
      isRegistered,
      joinSession,
      leaveSession,
      sendMessage,
      getSessionById,
    }),
    [
      data,
      sessions,
      createSession,
      updateStatus,
      registerForSession,
      unregisterFromSession,
      isRegistered,
      joinSession,
      leaveSession,
      sendMessage,
      getSessionById,
    ]
  );

  return (
    <LiveSessionContext.Provider
      value={value}
    >
      {children}
    </LiveSessionContext.Provider>
  );
}
