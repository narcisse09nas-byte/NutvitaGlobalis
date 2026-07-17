"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useCertificates } from "@/hooks/use-certificates";
import { useExam } from "@/hooks/use-exam";
import { useGamification } from "@/hooks/use-gamification";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useProgress } from "@/hooks/use-progress";
import { useQuiz } from "@/hooks/use-quiz";

import {
  buildAutomaticNotifications,
} from "@/lib/notification-engine";

import {
  loadNotificationPreferences,
  loadNotifications,
  saveNotificationPreferences,
  saveNotifications,
} from "@/lib/notification-storage";

import type {
  AcademyNotification,
  NotificationPreferences,
} from "@/types/notification";

type NotificationContextValue = {
  notifications: AcademyNotification[];
  unreadCount: number;

  preferences: NotificationPreferences;

  markAsRead: (
    notificationId: string
  ) => void;

  markAllAsRead: () => void;

  dismissNotification: (
    notificationId: string
  ) => void;

  updatePreferences: (
    preferences: NotificationPreferences
  ) => void;
};

export const NotificationContext =
  createContext<NotificationContextValue | null>(
    null
  );

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } =
    useLocalAuth();

  const { data } =
    useProgress();

  const {
    attempts: quizAttempts,
  } = useQuiz();

  const {
    attempts: examAttempts,
  } = useExam();

  const { certificates } =
    useCertificates();

  const { profile } =
    useGamification();

  const [
    storedNotifications,
    setStoredNotifications,
  ] = useState<
    AcademyNotification[]
  >([]);

  const [
    preferences,
    setPreferences,
  ] =
    useState<NotificationPreferences>({
      learningReminders: true,
      quizAlerts: true,
      examAlerts: true,
      certificateAlerts: true,
      rewardAlerts: true,
    });

  useEffect(() => {
    if (!user) {
      setStoredNotifications([]);
      return;
    }

    setStoredNotifications(
      loadNotifications(user.id)
    );

    setPreferences(
      loadNotificationPreferences(
        user.id
      )
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const sync = () => setStoredNotifications(loadNotifications(user.id));
    window.addEventListener("storage", sync);
    window.addEventListener("nutvita-notifications-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nutvita-notifications-updated", sync);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const generated =
      buildAutomaticNotifications({
        progressData: data,
        quizAttempts,
        examAttempts,
        certificates,
        gamificationProfile:
          profile,
        preferences,
      });

    setStoredNotifications(
      (current) => {
        const currentMap =
          new Map(
            current.map(
              (notification) => [
                notification.id,
                notification,
              ]
            )
          );

        const automatic = generated.map(
            (notification) => {
              const stored =
                currentMap.get(
                  notification.id
                );

              return stored
                ? {
                    ...notification,
                    readAt:
                      stored.readAt,
                    dismissedAt:
                      stored.dismissedAt,
                  }
                : notification;
            }
          );
        const manual = current.filter(
          (notification) =>
            notification.source === "manual" &&
            !automatic.some((item) => item.id === notification.id),
        );
        const merged = [...automatic, ...manual];

        saveNotifications(
          user.id,
          merged
        );

        return merged;
      }
    );
  }, [
    user,
    data,
    quizAttempts,
    examAttempts,
    certificates,
    profile,
    preferences,
  ]);

  const notifications =
    useMemo(
      () =>
        storedNotifications
          .filter(
            (notification) =>
              !notification.dismissedAt
          )
          .sort(
            (first, second) =>
              new Date(
                second.createdAt
              ).getTime() -
              new Date(
                first.createdAt
              ).getTime()
          ),
      [storedNotifications]
    );

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.readAt
    ).length;

  const persist =
    useCallback(
      (
        updater: (
          current:
            AcademyNotification[]
        ) =>
          AcademyNotification[]
      ) => {
        if (!user) {
          return;
        }

        setStoredNotifications(
          (current) => {
            const updated =
              updater(current);

            saveNotifications(
              user.id,
              updated
            );

            return updated;
          }
        );
      },
      [user]
    );

  const markAsRead =
    useCallback(
      (
        notificationId: string
      ) => {
        persist((current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,

                    readAt:
                      notification.readAt ??
                      new Date().toISOString(),
                  }
                : notification
          )
        );
      },
      [persist]
    );

  const markAllAsRead =
    useCallback(() => {
      const now =
        new Date().toISOString();

      persist((current) =>
        current.map(
          (notification) => ({
            ...notification,
            readAt:
              notification.readAt ??
              now,
          })
        )
      );
    }, [persist]);

  const dismissNotification =
    useCallback(
      (
        notificationId: string
      ) => {
        persist((current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,

                    dismissedAt:
                      new Date().toISOString(),
                  }
                : notification
          )
        );
      },
      [persist]
    );

  const updatePreferences =
    useCallback(
      (
        nextPreferences:
          NotificationPreferences
      ) => {
        if (!user) {
          return;
        }

        setPreferences(
          nextPreferences
        );

        saveNotificationPreferences(
          user.id,
          nextPreferences
        );
      },
      [user]
    );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      preferences,

      markAsRead,
      markAllAsRead,
      dismissNotification,
      updatePreferences,
    }),
    [
      notifications,
      unreadCount,
      preferences,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      updatePreferences,
    ]
  );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}
