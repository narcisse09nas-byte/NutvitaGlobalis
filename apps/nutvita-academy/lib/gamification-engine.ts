import {
  badgeDefinitions,
  gamificationLevels,
  xpRules,
} from "@/config/gamification";

import type {
  CertificateRecord,
} from "@/types/certification";

import type {
  ExamAttempt,
} from "@/types/exam";

import type {
  GamificationLevel,
  GamificationProfile,
} from "@/types/gamification";

import type {
  StudentProgressData,
} from "@/types/progress";

import type {
  QuizAttempt,
} from "@/types/quiz";

function normalizeDate(
  value: string
): string {
  return new Date(value)
    .toISOString()
    .slice(0, 10);
}

function getActivityDates(input: {
  progressData: StudentProgressData;
  quizAttempts: QuizAttempt[];
  examAttempts: ExamAttempt[];
  certificates: CertificateRecord[];
}): string[] {
  const dates = new Set<string>();

  Object.values(
    input.progressData.lessons
  ).forEach((lesson) => {
    dates.add(
      normalizeDate(
        lesson.lastVisitedAt
      )
    );
  });

  input.quizAttempts.forEach(
    (attempt) => {
      dates.add(
        normalizeDate(
          attempt.submittedAt
        )
      );
    }
  );

  input.examAttempts.forEach(
    (attempt) => {
      dates.add(
        normalizeDate(
          attempt.submittedAt
        )
      );
    }
  );

  input.certificates.forEach(
    (certificate) => {
      dates.add(
        normalizeDate(
          certificate.issueDate
        )
      );
    }
  );

  return Array.from(dates).sort();
}

function differenceInDays(
  firstDate: string,
  secondDate: string
): number {
  const first = new Date(
    `${firstDate}T00:00:00`
  ).getTime();

  const second = new Date(
    `${secondDate}T00:00:00`
  ).getTime();

  return Math.round(
    Math.abs(second - first) /
      86400000
  );
}

function calculateLongestStreak(
  dates: string[]
): number {
  if (dates.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (
    let index = 1;
    index < dates.length;
    index += 1
  ) {
    if (
      differenceInDays(
        dates[index - 1],
        dates[index]
      ) === 1
    ) {
      current += 1;
      longest = Math.max(
        longest,
        current
      );
    } else {
      current = 1;
    }
  }

  return longest;
}

function calculateCurrentStreak(
  dates: string[]
): number {
  if (dates.length === 0) {
    return 0;
  }

  const descendingDates = [
    ...dates,
  ].sort().reverse();

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const lastActivity =
    descendingDates[0];

  const differenceFromToday =
    differenceInDays(
      lastActivity,
      today
    );

  if (differenceFromToday > 1) {
    return 0;
  }

  let streak = 1;

  for (
    let index = 1;
    index < descendingDates.length;
    index += 1
  ) {
    if (
      differenceInDays(
        descendingDates[index - 1],
        descendingDates[index]
      ) === 1
    ) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getLevel(
  totalXp: number
) {
  return (
    gamificationLevels
      .slice()
      .reverse()
      .find(
        (level) =>
          totalXp >=
          level.minimumXp
      ) ?? gamificationLevels[0]
  );
}

function getNextLevel(
  level: GamificationLevel
) {
  const currentIndex =
    gamificationLevels.findIndex(
      (item) =>
        item.id === level
    );

  return (
    gamificationLevels[
      currentIndex + 1
    ] ?? null
  );
}

export function calculateGamificationProfile(
  input: {
    progressData: StudentProgressData;
    quizAttempts: QuizAttempt[];
    examAttempts: ExamAttempt[];
    certificates: CertificateRecord[];
  }
): GamificationProfile {
  const completedLessons =
    Object.values(
      input.progressData.lessons
    ).filter(
      (lesson) =>
        lesson.status ===
        "completed"
    ).length;

  const passedQuizzes =
    new Set(
      input.quizAttempts
        .filter(
          (attempt) =>
            attempt.passed
        )
        .map(
          (attempt) =>
            attempt.quizSlug
        )
    ).size;

  const passedExams =
    new Set(
      input.examAttempts
        .filter(
          (attempt) =>
            attempt.passed
        )
        .map(
          (attempt) =>
            attempt.examSlug
        )
    ).size;

  const certificatesCount =
    input.certificates.filter(
      (certificate) =>
        certificate.status ===
        "valid"
    ).length;

  const activityDates =
    getActivityDates(input);

  const currentStreak =
    calculateCurrentStreak(
      activityDates
    );

  const longestStreak =
    calculateLongestStreak(
      activityDates
    );

  const earnedBadgeIds: string[] = [];

  if (completedLessons >= 1) {
    earnedBadgeIds.push(
      "first-lesson"
    );
  }

  if (completedLessons >= 5) {
    earnedBadgeIds.push(
      "five-lessons"
    );
  }

  if (completedLessons >= 10) {
    earnedBadgeIds.push(
      "ten-lessons"
    );
  }

  if (passedQuizzes >= 1) {
    earnedBadgeIds.push(
      "first-quiz"
    );
  }

  if (passedQuizzes >= 5) {
    earnedBadgeIds.push(
      "quiz-master"
    );
  }

  if (passedExams >= 1) {
    earnedBadgeIds.push(
      "first-exam"
    );
  }

  if (longestStreak >= 3) {
    earnedBadgeIds.push(
      "three-day-streak"
    );
  }

  if (longestStreak >= 7) {
    earnedBadgeIds.push(
      "seven-day-streak"
    );
  }

  if (certificatesCount >= 1) {
    earnedBadgeIds.push(
      "first-certificate"
    );
  }

  if (
    input.certificates.some(
      (certificate) =>
        certificate.courseSlug ===
          "camms" &&
        certificate.status ===
          "valid"
    )
  ) {
    earnedBadgeIds.push(
      "camms-expert"
    );
  }

  const earnedBadges =
    badgeDefinitions
      .filter((badge) =>
        earnedBadgeIds.includes(
          badge.id
        )
      )
      .map((badge) => ({
        ...badge,
        earnedAt:
          new Date().toISOString(),
      }));

  const activityXp =
    completedLessons *
      xpRules.completedLesson +
    passedQuizzes *
      xpRules.passedQuiz +
    passedExams *
      xpRules.passedExam +
    certificatesCount *
      xpRules.certificateIssued +
    currentStreak *
      xpRules.streakDay;

  const badgeXp =
    earnedBadges.reduce(
      (total, badge) =>
        total + badge.xpReward,
      0
    );

  const totalXp =
    activityXp + badgeXp;

  const currentLevel =
    getLevel(totalXp);

  const nextLevel =
    getNextLevel(
      currentLevel.id
    );

  const progressToNextLevel =
    nextLevel === null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((totalXp -
                currentLevel.minimumXp) /
                (nextLevel.minimumXp -
                  currentLevel.minimumXp)) *
                100
            )
          )
        );

  return {
    totalXp,
    level: currentLevel.id,

    currentLevelMinimumXp:
      currentLevel.minimumXp,

    nextLevelMinimumXp:
      nextLevel?.minimumXp ??
      null,

    progressToNextLevel,

    completedLessons,
    passedQuizzes,
    passedExams,
    certificatesCount,

    currentStreak,
    longestStreak,

    earnedBadges,
  };
}