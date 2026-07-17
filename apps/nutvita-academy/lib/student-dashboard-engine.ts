import {
  getLocalCourseBySlug,
} from "@/lib/course-catalog";

import type {
  CertificateRecord,
} from "@/types/certification";

import type {
  ExamAttempt,
} from "@/types/exam";

import type {
  GamificationProfile,
} from "@/types/gamification";

import type {
  AcademyNotification,
} from "@/types/notification";

import type {
  StudentProgressData,
} from "@/types/progress";

import type {
  QuizAttempt,
} from "@/types/quiz";

import type {
  StudentDashboardViewModel,
} from "@/types/student-dashboard";

function formatLearningTime(
  seconds: number
): string {
  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
        60
    );

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes
    .toString()
    .padStart(2, "0")}`;
}

function getBestScore(
  attempts: Array<{
    scorePercent: number;
  }>
): number | null {
  if (attempts.length === 0) {
    return null;
  }

  return Math.max(
    ...attempts.map(
      (attempt) =>
        attempt.scorePercent
    )
  );
}

export function buildStudentDashboard(
  input: {
    progressData: StudentProgressData;
    quizAttempts: QuizAttempt[];
    examAttempts: ExamAttempt[];
    certificates: CertificateRecord[];
    gamificationProfile: GamificationProfile;
    notifications: AcademyNotification[];
  }
): StudentDashboardViewModel {
  const lessons =
    Object.values(
      input.progressData.lessons
    );

  const totalTimeSeconds =
    lessons.reduce(
      (total, lesson) =>
        total +
        lesson.timeSpentSeconds,
      0
    );

  const completedLessons =
    lessons.filter(
      (lesson) =>
        lesson.status ===
        "completed"
    ).length;

  const passedQuizAttempts =
    input.quizAttempts.filter(
      (attempt) =>
        attempt.passed
    );

  const passedExamAttempts =
    input.examAttempts.filter(
      (attempt) =>
        attempt.passed
    );

  const validCertificates =
    input.certificates.filter(
      (certificate) =>
        certificate.status ===
        "valid"
    );

  const activeCourseSlug =
    Object.values(
      input.progressData.lastPositions
    )
      .sort(
        (first, second) =>
          new Date(
            second.updatedAt
          ).getTime() -
          new Date(
            first.updatedAt
          ).getTime()
      )[0]?.courseSlug;

  const course =
    activeCourseSlug ? getLocalCourseBySlug(activeCourseSlug) : null;

  let currentLearning:
    StudentDashboardViewModel["currentLearning"] =
    null;

  if (course) {
    const courseLessons =
      course.modules.flatMap(
        (module) =>
          module.lessons.map(
            (lesson) => ({
              module,
              lesson,
            })
          )
      );

    const courseProgressLessons =
      lessons.filter(
        (lesson) =>
          lesson.courseSlug ===
          course.slug
      );

    const completedCourseLessons =
      courseProgressLessons.filter(
        (lesson) =>
          lesson.status ===
          "completed"
      ).length;

    const totalCourseLessons =
      courseLessons.length;

    const progressPercent =
      totalCourseLessons === 0
        ? 0
        : Math.round(
            (completedCourseLessons /
              totalCourseLessons) *
              100
          );

    const lastPosition =
      input.progressData
        .lastPositions[
        course.slug
      ];

    const currentModule =
      course.modules.find(
        (item) =>
          item.slug ===
          lastPosition?.moduleSlug
      ) ??
      course.modules[0];

    const lesson =
      currentModule?.lessons.find(
        (item) =>
          item.slug ===
          lastPosition?.lessonSlug
      ) ??
      currentModule?.lessons.find(
        (item) =>
          item.status !==
          "locked"
      );

    const href =
      currentModule && lesson
        ? `/dashboard/courses/${course.slug}/${currentModule.slug}?lesson=${lesson.slug}`
        : `/dashboard/courses/${course.slug}`;

    currentLearning = {
      courseSlug:
        course.slug,

      courseTitle:
        course.title,

      courseTitleFr:
        course.titleFr,

      moduleSlug:
        currentModule?.slug,

      moduleTitle:
        currentModule?.title,

      lessonSlug:
        lesson?.slug,

      lessonTitle:
        lesson?.title,

      progressPercent,

      completedLessons:
        completedCourseLessons,

      totalLessons:
        totalCourseLessons,

      timeSpentSeconds:
        courseProgressLessons.reduce(
          (total, item) =>
            total +
            item.timeSpentSeconds,
          0
        ),

      href,
    };
  }

  const metrics = [
    {
      id: "learning-time",

      label:
        "Temps d’apprentissage",

      value:
        formatLearningTime(
          totalTimeSeconds
        ),

      description:
        "Temps total enregistré",

      href:
        "/dashboard/history",
    },

    {
      id: "completed-lessons",

      label:
        "Leçons terminées",

      value:
        completedLessons.toString(),

      description:
        "Toutes formations confondues",

      href:
        "/dashboard/courses",
    },

    {
      id: "quizzes",

      label:
        "Quiz réussis",

      value:
        new Set(
          passedQuizAttempts.map(
            (attempt) =>
              attempt.quizSlug
          )
        ).size.toString(),

      description:
        getBestScore(
          input.quizAttempts
        ) !== null
          ? `Meilleur score : ${getBestScore(
              input.quizAttempts
            )} %`
          : "Aucune tentative",

      href:
        "/dashboard/assessments",
    },

    {
      id: "certificates",

      label:
        "Certificats",

      value:
        validCertificates.length.toString(),

      description:
        validCertificates.length >
        0
          ? "Certificat disponible"
          : "Continuez votre progression",

      href:
        "/dashboard/certificates",
    },
  ];

  const recommendations:
    StudentDashboardViewModel["recommendations"] =
    [];

  const failedExam =
    input.examAttempts
      .filter(
        (attempt) =>
          !attempt.passed
      )
      .sort(
        (first, second) =>
          new Date(
            second.submittedAt
          ).getTime() -
          new Date(
            first.submittedAt
          ).getTime()
      )[0];

  const failedQuiz =
    input.quizAttempts
      .filter(
        (attempt) =>
          !attempt.passed
      )
      .sort(
        (first, second) =>
          new Date(
            second.submittedAt
          ).getTime() -
          new Date(
            first.submittedAt
          ).getTime()
      )[0];

  if (failedExam) {
    recommendations.push({
      id: "review-exam",

      title:
        "Préparez votre nouvelle tentative",

      description:
        `Votre dernier score à l’examen est de ${failedExam.scorePercent} %. Revoyez vos domaines les plus faibles.`,

      href:
        `/dashboard/exams/${failedExam.examSlug}`,

      actionLabel:
        "Analyser l’examen",

      priority: "high",
    });
  }

  if (failedQuiz) {
    recommendations.push({
      id: "review-quiz",

      title:
        "Révisez avant de reprendre le quiz",

      description:
        `Votre dernier score est de ${failedQuiz.scorePercent} %. Consultez les ressources et les explications de correction.`,

      href:
        `/dashboard/assessments/${failedQuiz.quizSlug}`,

      actionLabel:
        "Revoir le quiz",

      priority: "high",
    });
  }

  if (
    currentLearning &&
    currentLearning.progressPercent <
      100
  ) {
    recommendations.push({
      id: "continue-course",

      title:
        "Continuez votre formation active",

      description:
        `Vous avez terminé ${currentLearning.completedLessons} leçon(s) sur ${currentLearning.totalLessons}.`,

      href:
        currentLearning.href,

      actionLabel:
        "Reprendre la formation",

      priority: "normal",
    });
  }

  if (
    input.gamificationProfile
      .currentStreak === 0
  ) {
    recommendations.push({
      id: "restart-streak",

      title:
        "Commencez une nouvelle série",

      description:
        "Consacrez quelques minutes à une leçon aujourd’hui pour relancer votre série d’apprentissage.",

      href:
        currentLearning?.href ??
        "/dashboard/courses",

      actionLabel:
        "Étudier maintenant",

      priority: "low",
    });
  }

  if (
    validCertificates.length ===
      0 &&
    passedExamAttempts.length > 0
  ) {
    recommendations.push({
      id: "check-certificate",

      title:
        "Vérifiez votre éligibilité au certificat",

      description:
        "Vous avez réussi un examen final. Vérifiez si toutes les autres conditions sont remplies.",

      href:
        "/dashboard/certificates",

      actionLabel:
        "Vérifier mon éligibilité",

      priority: "normal",
    });
  }

  if (
    recommendations.length ===
    0
  ) {
    recommendations.push({
      id: "explore-resources",

      title:
        "Approfondissez vos connaissances",

      description:
        "Consultez les guides, protocoles et ressources complémentaires de la bibliothèque.",

      href:
        "/dashboard/resources",

      actionLabel:
        "Ouvrir la bibliothèque",

      priority: "low",
    });
  }

  return {
    currentLearning,

    metrics,

    performance: {
      passedQuizzes:
        new Set(
          passedQuizAttempts.map(
            (attempt) =>
              attempt.quizSlug
          )
        ).size,

      bestQuizScore:
        getBestScore(
          input.quizAttempts
        ),

      passedExams:
        new Set(
          passedExamAttempts.map(
            (attempt) =>
              attempt.examSlug
          )
        ).size,

      bestExamScore:
        getBestScore(
          input.examAttempts
        ),

      certificatesCount:
        validCertificates.length,

      totalXp:
        input.gamificationProfile
          .totalXp,

      level:
        input.gamificationProfile
          .level,

      currentStreak:
        input.gamificationProfile
          .currentStreak,

      recentBadges:
        input.gamificationProfile
          .earnedBadges.slice(
            -3
          ),
    },

    recommendations:
      recommendations.slice(0, 4),

    importantNotifications:
      input.notifications
        .filter(
          (notification) =>
            !notification.readAt
        )
        .slice(0, 3),
  };
}
