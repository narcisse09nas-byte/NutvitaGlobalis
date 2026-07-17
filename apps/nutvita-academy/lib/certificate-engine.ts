import type {
  AcademyCourse,
} from "@/types/course";

import type {
  CertificateRecord,
  CertificationRequirement,
  CertificationEligibilityResult,
} from "@/types/certification";

import type {
  LocalUser,
} from "@/types/local-auth";

import type {
  ExamAttempt,
} from "@/types/exam";

import type {
  QuizAttempt,
} from "@/types/quiz";

import type {
  ProgressSummary,
} from "@/types/progress";

import {
  getCertificationRequirement,
} from "@/data/certification-rules";

function createCertificateId(courseCode: string): string {
  const year =
    new Date().getFullYear();

  const randomPart =
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

  const safeCode = courseCode.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-") || "NVGA";
  return `${safeCode}-${year}-${randomPart}`;
}

export function evaluateCertificationEligibility(input: {
  course: AcademyCourse;
  progressSummary: ProgressSummary;
  quizAttempts: QuizAttempt[];
  examAttempts: ExamAttempt[];
  requirement?: CertificationRequirement | null;
}): CertificationEligibilityResult {
  const {
    course,
    progressSummary,
    quizAttempts,
    examAttempts,
    requirement: providedRequirement,
  } = input;

  const requirement = providedRequirement === undefined
    ? getCertificationRequirement(course.slug)
    : providedRequirement;

  if (!requirement) {
    return {
      eligible: false,
      courseProgress:
        progressSummary.progressPercent,
      courseCompleted: false,
      quizzesCompleted: false,
      missingQuizSlugs: [],
      examCompleted: false,
      examScore: null,
      reasons: [
        "Aucune règle de certification n’est configurée pour cette formation.",
      ],
    };
  }

  const courseCompleted =
    progressSummary.progressPercent >=
    requirement.minimumCourseProgress;

  const passedQuizSlugs =
    new Set(
      quizAttempts
        .filter(
          (attempt) => attempt.passed
        )
        .map(
          (attempt) =>
            attempt.quizSlug
        )
    );

  const missingQuizSlugs =
    requirement.requiredQuizSlugs.filter(
      (quizSlug) =>
        !passedQuizSlugs.has(
          quizSlug
        )
    );

  const quizzesCompleted =
    missingQuizSlugs.length === 0;

  const passedExamAttempts =
    examAttempts
      .filter(
        (attempt) =>
          attempt.examSlug ===
            requirement.requiredExamSlug &&
          attempt.passed
      )
      .sort(
        (first, second) =>
          second.scorePercent -
          first.scorePercent
      );

  const bestExamAttempt =
    passedExamAttempts[0] ??
    null;

  const examCompleted =
    Boolean(bestExamAttempt);

  const reasons: string[] = [];

  if (!courseCompleted) {
    reasons.push(
      `La formation doit être terminée à ${requirement.minimumCourseProgress} %.`
    );
  }

  if (!quizzesCompleted) {
    reasons.push(
      "Tous les quiz obligatoires doivent être réussis."
    );
  }

  if (!examCompleted) {
    reasons.push(
      "L’examen final certifiant doit être réussi."
    );
  }

  return {
    eligible:
      courseCompleted &&
      quizzesCompleted &&
      examCompleted,

    courseProgress:
      progressSummary.progressPercent,

    courseCompleted,

    quizzesCompleted,
    missingQuizSlugs,

    examCompleted,

    examScore:
      bestExamAttempt
        ?.scorePercent ?? null,

    reasons,
  };
}

export function createCertificateRecord(input: {
  user: Pick<LocalUser, "id" | "fullName" | "email">;
  course: AcademyCourse;
  finalScore: number;
}): CertificateRecord {
  const {
    user,
    course,
    finalScore,
  } = input;

  const certificateNumber =
    createCertificateId(course.code);

  const issueDate =
    new Date().toISOString();

  return {
    id: certificateNumber,
    certificateNumber,

    userId: user.id,
    recipientName:
      user.fullName,
    recipientEmail:
      user.email,

    courseSlug:
      course.slug,

    courseCode:
      course.code,

    courseTitle:
      course.title,

    courseTitleFr:
      course.titleFr,

    issueDate,

    status: "valid",

    finalScore,

    verificationPath:
      `/verify/${certificateNumber}`,

    academicDirector:
      "Paul N.",

    createdAt: issueDate,
  };
}
