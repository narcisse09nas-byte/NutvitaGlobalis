export type CertificateStatus =
  | "valid"
  | "revoked"
  | "expired";

export type CertificationRequirement = {
  courseSlug: string;
  requiredQuizSlugs: string[];
  requiredExamSlug: string;
  minimumCourseProgress: number;
};

export type CertificateRecord = {
  id: string;
  certificateNumber: string;

  userId: string;
  recipientName: string;
  recipientEmail: string;

  courseSlug: string;
  courseCode: string;
  courseTitle: string;
  courseTitleFr: string;

  issueDate: string;
  expirationDate?: string;

  status: CertificateStatus;

  finalScore: number;
  verificationPath: string;

  academicDirector: string;
  createdAt: string;
};

export type CertificationEligibilityResult = {
  eligible: boolean;

  courseProgress: number;
  courseCompleted: boolean;

  quizzesCompleted: boolean;
  missingQuizSlugs: string[];

  examCompleted: boolean;
  examScore: number | null;

  reasons: string[];
};