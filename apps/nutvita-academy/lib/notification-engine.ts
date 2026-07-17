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
  NotificationPreferences,
} from "@/types/notification";

import type {
  StudentProgressData,
} from "@/types/progress";

import type {
  QuizAttempt,
} from "@/types/quiz";
import type { ExamBooking, ExamConductRating } from "@/types/proctoring";

export function buildConductDecisionNotification(
  booking: ExamBooking,
  rating: ExamConductRating,
): AcademyNotification {
  const createdAt = new Date().toISOString();
  const attemptNumber = booking.attemptNumber || 1;
  const score = booking.attemptScorePercent ?? 0;
  const successful =
    booking.attemptPassed === true &&
    (rating === "good" || rating === "passable");
  if (successful) {
    return {
      id: `exam-decision-${booking.id}`,
      type: "certificate",
      priority: "high",
      source: "manual",
      title: "🎉 Félicitations, votre certification est validée !",
      titleEn: "🎉 Congratulations, your certification is approved!",
      message: `Toutes nos félicitations ! Vous avez réussi l’examen avec ${score} % et le surveillant a jugé son déroulement ${rating === "good" ? "Bon" : "Passable"}. Votre certificat est maintenant déverrouillé et disponible dans votre espace.`,
      messageEn: `Congratulations! You passed the exam with ${score}% and the proctor rated the session ${rating === "good" ? "Good" : "Passable"}. Your certificate is now unlocked and available in your account.`,
      href: "/dashboard/certificates",
      createdAt,
    };
  }
  const exhausted = attemptNumber >= 3;
  const academicReason = booking.attemptPassed
    ? "Votre note académique est suffisante, mais les conditions de déroulement ont été jugées insuffisantes (Poor)."
    : `Votre résultat de ${score} % est inférieur au seuil requis de 70 %, et la session a été classée Poor.`;
  const academicReasonEn = booking.attemptPassed
    ? "Your academic score is sufficient, but the examination conditions were rated insufficient (Poor)."
    : `Your score of ${score}% is below the required 70% threshold, and the session was rated Poor.`;
  if (exhausted) {
    return {
      id: `exam-decision-${booking.id}`,
      type: "exam",
      priority: "high",
      source: "manual",
      title: "Décision finale concernant votre certification",
      titleEn: "Final decision regarding your certification",
      message: `${academicReason} Vous avez malheureusement utilisé les trois tentatives autorisées. Nous vous encourageons à reprendre la formation afin de consolider vos acquis, puis à procéder à une nouvelle inscription lorsque vous vous sentirez prêt.`,
      messageEn: `${academicReasonEn} Unfortunately, you have used all three authorized attempts. We encourage you to take the course again to strengthen your knowledge and enroll again when you feel ready.`,
      href: `/dashboard/marketplace/${booking.courseSlug}`,
      createdAt,
    };
  }
  const delay = attemptNumber === 1 ? 7 : 21;
  return {
    id: `exam-decision-${booking.id}`,
    type: "exam",
    priority: "high",
    source: "manual",
    title: "Votre prochaine tentative reste possible",
    titleEn: "You may take the exam again",
    message: `${academicReason} Ne vous découragez pas : vous pourrez réserver une nouvelle épreuve dans un créneau situé au moins ${delay} jours après cette tentative. Nous vous invitons à revoir vos résultats et les modules concernés avant de recommencer.`,
    messageEn: `${academicReasonEn} Please do not be discouraged: you may book a new exam slot at least ${delay} days after this attempt. We invite you to review your results and the relevant modules before trying again.`,
    href: "/dashboard/exams/schedule",
    createdAt,
  };
}

function makeDate(
  value?: string
): string {
  return (
    value ??
    new Date().toISOString()
  );
}

export function buildAutomaticNotifications(
  input: {
    progressData: StudentProgressData;
    quizAttempts: QuizAttempt[];
    examAttempts: ExamAttempt[];
    certificates: CertificateRecord[];
    gamificationProfile: GamificationProfile;
    preferences: NotificationPreferences;
  }
): AcademyNotification[] {
  const notifications:
    AcademyNotification[] = [];

  const lessons =
    Object.values(
      input.progressData.lessons
    );

  const inProgressLesson =
    lessons
      .filter(
        (lesson) =>
          lesson.status ===
          "in_progress"
      )
      .sort(
        (first, second) =>
          new Date(
            second.lastVisitedAt
          ).getTime() -
          new Date(
            first.lastVisitedAt
          ).getTime()
      )[0];

  if (
    input.preferences
      .learningReminders &&
    inProgressLesson
  ) {
    notifications.push({
      id: `learning-${inProgressLesson.lessonId}`,

      type: "learning",
      priority: "normal",

      title:
        "Continuez votre formation",

      message:
        "Une leçon est encore en cours. Reprenez votre apprentissage là où vous vous êtes arrêté.",

      href:
        `/dashboard/courses/${inProgressLesson.courseSlug}/${inProgressLesson.moduleSlug}?lesson=${inProgressLesson.lessonSlug}`,

      createdAt:
        makeDate(
          inProgressLesson.lastVisitedAt
        ),
    });
  }

  const lastFailedQuiz =
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

  if (
    input.preferences.quizAlerts &&
    lastFailedQuiz
  ) {
    notifications.push({
      id: `quiz-failed-${lastFailedQuiz.id}`,

      type: "quiz",
      priority: "high",

      title:
        "Quiz à reprendre",

      message:
        `Votre dernier score est de ${lastFailedQuiz.scorePercent} %. Revoyez les notions difficiles avant une nouvelle tentative.`,

      href:
        `/dashboard/assessments/${lastFailedQuiz.quizSlug}`,

      createdAt:
        makeDate(
          lastFailedQuiz.submittedAt
        ),
    });
  }

  const lastPassedQuiz =
    input.quizAttempts
      .filter(
        (attempt) =>
          attempt.passed
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

  if (
    input.preferences.quizAlerts &&
    lastPassedQuiz
  ) {
    notifications.push({
      id: `quiz-passed-${lastPassedQuiz.id}`,

      type: "quiz",
      priority: "normal",

      title:
        "Quiz réussi",

      message:
        `Félicitations ! Vous avez obtenu ${lastPassedQuiz.scorePercent} %.`,

      href:
        `/dashboard/assessments/${lastPassedQuiz.quizSlug}`,

      createdAt:
        makeDate(
          lastPassedQuiz.submittedAt
        ),
    });
  }

  const lastFailedExam =
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

  if (
    input.preferences.examAlerts &&
    lastFailedExam
  ) {
    notifications.push({
      id: `exam-failed-${lastFailedExam.id}`,

      type: "exam",
      priority: "high",

      title:
        "Examen final non réussi",

      message:
        `Votre score est de ${lastFailedExam.scorePercent} %. Analysez vos résultats par domaine avant la prochaine tentative.`,

      href:
        `/dashboard/exams/${lastFailedExam.examSlug}`,

      createdAt:
        makeDate(
          lastFailedExam.submittedAt
        ),
    });
  }

  const lastPassedExam =
    input.examAttempts
      .filter(
        (attempt) =>
          attempt.passed
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

  if (
    input.preferences.examAlerts &&
    lastPassedExam
  ) {
    notifications.push({
      id: `exam-passed-${lastPassedExam.id}`,

      type: "exam",
      priority: "high",

      title:
        "Examen certifiant réussi",

      message:
        `Vous avez réussi l’examen final avec ${lastPassedExam.scorePercent} %. Vérifiez maintenant votre éligibilité au certificat.`,

      href:
        "/dashboard/certificates",

      createdAt:
        makeDate(
          lastPassedExam.submittedAt
        ),
    });
  }

  if (
    input.preferences
      .certificateAlerts
  ) {
    input.certificates
      .filter(
        (certificate) =>
          certificate.status ===
          "valid"
      )
      .forEach(
        (certificate) => {
          notifications.push({
            id: `certificate-${certificate.id}`,

            type: "certificate",
            priority: "high",

            title:
              "Votre certificat est disponible",

            message:
              `Le certificat ${certificate.courseCode} a été généré avec succès.`,

            href:
              `/dashboard/certificates/${certificate.id}`,

            createdAt:
              makeDate(
                certificate.issueDate
              ),
          });
        }
      );
  }

  if (
    input.preferences.rewardAlerts &&
    input.gamificationProfile
      .earnedBadges.length > 0
  ) {
    const latestBadge =
      input.gamificationProfile
        .earnedBadges[
        input.gamificationProfile
          .earnedBadges.length - 1
      ];

    notifications.push({
      id: `reward-${latestBadge.id}`,

      type: "reward",
      priority: "normal",

      title:
        "Nouvelle récompense",

      message:
        `Vous avez débloqué le badge « ${latestBadge.title} » et gagné ${latestBadge.xpReward} XP.`,

      href:
        "/dashboard/rewards",

      createdAt:
        makeDate(
          latestBadge.earnedAt
        ),
    });
  }

  if (
    input.gamificationProfile
      .currentStreak >= 3
  ) {
    notifications.push({
      id: `streak-${input.gamificationProfile.currentStreak}`,

      type: "reward",
      priority: "normal",

      title:
        "Votre série continue",

      message:
        `Vous étudiez depuis ${input.gamificationProfile.currentStreak} jours consécutifs. Continuez ainsi !`,

      href:
        "/dashboard/rewards",

      createdAt:
        new Date().toISOString(),
    });
  }

  return notifications;
}
