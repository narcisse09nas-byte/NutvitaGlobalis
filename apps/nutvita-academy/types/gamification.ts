export type GamificationLevel =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

export type BadgeCategory =
  | "learning"
  | "quiz"
  | "exam"
  | "consistency"
  | "certification";

export type BadgeDefinition = {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  category: BadgeCategory;
  icon: string;
  xpReward: number;
};

export type EarnedBadge = BadgeDefinition & {
  earnedAt: string;
};

export type GamificationProfile = {
  totalXp: number;
  level: GamificationLevel;
  currentLevelMinimumXp: number;
  nextLevelMinimumXp: number | null;
  progressToNextLevel: number;
  completedLessons: number;
  passedQuizzes: number;
  passedExams: number;
  certificatesCount: number;
  currentStreak: number;
  longestStreak: number;
  earnedBadges: EarnedBadge[];
};
