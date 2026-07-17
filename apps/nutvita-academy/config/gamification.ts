import type {
  BadgeDefinition,
  GamificationLevel,
} from "@/types/gamification";

export type LevelDefinition = {
  id: GamificationLevel;
  label: string;
  minimumXp: number;
  maximumXp: number | null;
};

export const gamificationLevels: LevelDefinition[] = [
  {
    id: "bronze",
    label: "Bronze",
    minimumXp: 0,
    maximumXp: 499,
  },
  {
    id: "silver",
    label: "Silver",
    minimumXp: 500,
    maximumXp: 1499,
  },
  {
    id: "gold",
    label: "Gold",
    minimumXp: 1500,
    maximumXp: 2999,
  },
  {
    id: "platinum",
    label: "Platinum",
    minimumXp: 3000,
    maximumXp: 4999,
  },
  {
    id: "diamond",
    label: "Diamond",
    minimumXp: 5000,
    maximumXp: null,
  },
];

export const xpRules = {
  completedLesson: 20,
  passedQuiz: 50,
  passedExam: 250,
  certificateIssued: 500,
  streakDay: 10,
};

export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: "first-lesson",
    title: "Premier pas",
    titleEn: "First step",
    description:
      "Terminer votre première leçon.",
    descriptionEn: "Complete your first lesson.",
    category: "learning",
    icon: "📘",
    xpReward: 25,
  },
  {
    id: "five-lessons",
    title: "Apprenant engagé",
    titleEn: "Engaged learner",
    description:
      "Terminer au moins 5 leçons.",
    descriptionEn: "Complete at least 5 lessons.",
    category: "learning",
    icon: "📚",
    xpReward: 50,
  },
  {
    id: "ten-lessons",
    title: "Explorateur du savoir",
    titleEn: "Knowledge explorer",
    description:
      "Terminer au moins 10 leçons.",
    descriptionEn: "Complete at least 10 lessons.",
    category: "learning",
    icon: "🧭",
    xpReward: 100,
  },
  {
    id: "first-quiz",
    title: "Premier quiz réussi",
    titleEn: "First quiz passed",
    description:
      "Réussir votre premier quiz.",
    descriptionEn: "Pass your first quiz.",
    category: "quiz",
    icon: "✅",
    xpReward: 50,
  },
  {
    id: "quiz-master",
    title: "Quiz Master",
    titleEn: "Quiz Master",
    description:
      "Réussir au moins 5 quiz.",
    descriptionEn: "Pass at least 5 quizzes.",
    category: "quiz",
    icon: "🧠",
    xpReward: 150,
  },
  {
    id: "first-exam",
    title: "Examen certifiant réussi",
    titleEn: "Certification exam passed",
    description:
      "Réussir votre premier examen final.",
    descriptionEn: "Pass your first final exam.",
    category: "exam",
    icon: "🏆",
    xpReward: 250,
  },
  {
    id: "three-day-streak",
    title: "Série de 3 jours",
    titleEn: "3-day streak",
    description:
      "Étudier pendant 3 jours consécutifs.",
    descriptionEn: "Study for 3 consecutive days.",
    category: "consistency",
    icon: "🔥",
    xpReward: 75,
  },
  {
    id: "seven-day-streak",
    title: "Semaine parfaite",
    titleEn: "Perfect week",
    description:
      "Étudier pendant 7 jours consécutifs.",
    descriptionEn: "Study for 7 consecutive days.",
    category: "consistency",
    icon: "⚡",
    xpReward: 200,
  },
  {
    id: "first-certificate",
    title: "Professionnel certifié",
    titleEn: "Certified professional",
    description:
      "Obtenir votre premier certificat.",
    descriptionEn: "Earn your first certificate.",
    category: "certification",
    icon: "🎓",
    xpReward: 500,
  },
  {
    id: "camms-expert",
    title: "CAMMS Expert",
    titleEn: "CAMMS Expert",
    description:
      "Obtenir la certification CAMMS.",
    descriptionEn: "Earn the CAMMS certification.",
    category: "certification",
    icon: "🌍",
    xpReward: 750,
  },
];
