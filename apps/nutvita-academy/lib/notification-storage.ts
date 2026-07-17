import type {
  AcademyNotification,
  NotificationPreferences,
} from "@/types/notification";

const NOTIFICATIONS_PREFIX =
  "nutvita-notifications";

const PREFERENCES_PREFIX =
  "nutvita-notification-preferences";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notificationsKey(
  userId: string
): string {
  return `${NOTIFICATIONS_PREFIX}:${userId}`;
}

function preferencesKey(
  userId: string
): string {
  return `${PREFERENCES_PREFIX}:${userId}`;
}

export function loadNotifications(
  userId: string
): AcademyNotification[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const stored =
      localStorage.getItem(
        notificationsKey(userId)
      );

    if (!stored) {
      return [];
    }

    return JSON.parse(
      stored
    ) as AcademyNotification[];
  } catch {
    return [];
  }
}

export function saveNotifications(
  userId: string,
  notifications: AcademyNotification[]
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    notificationsKey(userId),
    JSON.stringify(notifications)
  );
}

export function loadNotificationPreferences(
  userId: string
): NotificationPreferences {
  const defaults: NotificationPreferences = {
    learningReminders: true,
    quizAlerts: true,
    examAlerts: true,
    certificateAlerts: true,
    rewardAlerts: true,
  };

  if (!isBrowser()) {
    return defaults;
  }

  try {
    const stored =
      localStorage.getItem(
        preferencesKey(userId)
      );

    if (!stored) {
      return defaults;
    }

    return {
      ...defaults,
      ...(JSON.parse(
        stored
      ) as Partial<NotificationPreferences>),
    };
  } catch {
    return defaults;
  }
}

export function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    preferencesKey(userId),
    JSON.stringify(preferences)
  );
}

export function pushNotificationForUser(
  userId: string,
  notification: AcademyNotification,
): void {
  if (!isBrowser()) return;
  const current = loadNotifications(userId);
  const updated = [
    notification,
    ...current.filter((item) => item.id !== notification.id),
  ];
  saveNotifications(userId, updated);
  window.dispatchEvent(new Event("nutvita-notifications-updated"));
}
