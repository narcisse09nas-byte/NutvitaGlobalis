import type {
  AcademyNotification,
} from "@/types/notification";

import type {
  EarnedBadge,
  GamificationLevel,
} from "@/types/gamification";

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  description: string;
  href?: string;
};

export type DashboardCurrentLearning = {
  courseSlug: string;
  courseTitle: string;
  courseTitleFr: string;

  moduleSlug?: string;
  moduleTitle?: string;

  lessonSlug?: string;
  lessonTitle?: string;

  progressPercent: number;
  completedLessons: number;
  totalLessons: number;

  timeSpentSeconds: number;
  href: string;
};

export type DashboardPerformance = {
  passedQuizzes: number;
  bestQuizScore: number | null;

  passedExams: number;
  bestExamScore: number | null;

  certificatesCount: number;

  totalXp: number;
  level: GamificationLevel;
  currentStreak: number;

  recentBadges: EarnedBadge[];
};

export type DashboardRecommendation = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  priority: "high" | "normal" | "low";
};

export type StudentDashboardViewModel = {
  currentLearning:
    | DashboardCurrentLearning
    | null;

  metrics: DashboardMetric[];

  performance: DashboardPerformance;

  recommendations:
    DashboardRecommendation[];

  importantNotifications:
    AcademyNotification[];
};