export type ExamQuestionType =
  "single" | "multiple" | "true_false" | "numeric" | "case_single";

export type ExamQuestionSection = "qcm" | "qcu" | "case_study";

export type ExamBlueprint = {
  qcmCount: number;
  qcuCount: number;
  caseStudyCount: number;
};

export type ExamDifficulty = "easy" | "medium" | "hard" | "expert";

export type ExamDomain =
  | "fundamentals"
  | "anthropometry"
  | "screening"
  | "clinical"
  | "cmam"
  | "monitoring";

export type ExamOption = {
  id: string;
  text: string;
  textEn?: string;
};

export type ExamQuestion = {
  id: string;
  domain: ExamDomain;
  difficulty: ExamDifficulty;
  type: ExamQuestionType;
  section?: ExamQuestionSection;

  prompt: string;
  promptEn?: string;
  caseText?: string;
  caseTextEn?: string;
  imageUrl?: string;

  options?: ExamOption[];
  correctOptionIds?: string[];

  correctNumericAnswer?: number;
  numericTolerance?: number;
  numericUnit?: string;

  explanation: string;
  explanationEn?: string;
  points: number;
  negativePoints?: number;
};

export type ExamDomainRule = {
  domain: ExamDomain;
  numberOfQuestions: number;
};

export type ExamDefinition = {
  id: string;
  slug: string;
  code: string;

  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;

  courseSlug: string;
  courseTitle: string;

  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;
  blueprint?: ExamBlueprint;
  retakeDelayDays?: [number, number];

  domainRules: ExamDomainRule[];

  shuffleQuestions: boolean;
  shuffleOptions: boolean;

  maxFocusViolations: number;
  autosaveIntervalSeconds: number;
};

export type ExamAnswerValue = string[] | number | null;

export type ExamAnswers = Record<string, ExamAnswerValue>;

export type ExamSessionStatus =
  "in_progress" | "submitted" | "expired" | "cancelled";

export type ExamSession = {
  id: string;
  userId: string;
  examSlug: string;
  bookingId?: string;
  paperId?: string;
  attemptNumber?: number;

  questionIds: string[];
  answers: ExamAnswers;

  currentQuestionIndex: number;
  remainingSeconds: number;

  focusViolations: number;
  status: ExamSessionStatus;

  startedAt: string;
  updatedAt: string;
};

export type ExamQuestionCorrection = {
  question: ExamQuestion;
  answer: ExamAnswerValue;
  earnedPoints: number;
  maximumPoints: number;
  isCorrect: boolean;
};

export type ExamDomainResult = {
  domain: ExamDomain;
  earnedPoints: number;
  maximumPoints: number;
  scorePercent: number;
};

export type ExamAttempt = {
  id: string;
  userId: string;
  examSlug: string;
  bookingId?: string;
  paperId?: string;
  attemptNumber?: number;

  questionIds: string[];
  answers: ExamAnswers;

  scorePercent: number;
  earnedPoints: number;
  maximumPoints: number;

  passed: boolean;
  focusViolations: number;

  domainResults: ExamDomainResult[];
  corrections: ExamQuestionCorrection[];

  startedAt: string;
  submittedAt: string;
  durationSeconds: number;
};

export type ExamEligibility = {
  eligible: boolean;
  reasons: string[];
};

export type ExamPaper = {
  id: string;
  examSlug: string;
  userId: string;
  attemptNumber: number;
  seed: string;
  fingerprint: string;
  blueprint: ExamBlueprint;
  questions: ExamQuestion[];
  generatedAt: string;
};
