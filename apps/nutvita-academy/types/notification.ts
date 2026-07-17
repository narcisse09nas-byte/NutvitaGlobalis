export type NotificationType =
  | "learning"
  | "quiz"
  | "exam"
  | "certificate"
  | "reward"
  | "system";

export type NotificationPriority =
  | "low"
  | "normal"
  | "high";

export type AcademyNotification = {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;

  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  source?: "automatic" | "manual";

  href?: string;

  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
};

export type NotificationPreferences = {
  learningReminders: boolean;
  quizAlerts: boolean;
  examAlerts: boolean;
  certificateAlerts: boolean;
  rewardAlerts: boolean;
};
