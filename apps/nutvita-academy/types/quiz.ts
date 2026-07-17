export type QuizQuestionType = "single" | "multiple";

export type QuizOption = {
  id: string;
  text: string;
  textEn?: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  promptEn?: string;
  type: QuizQuestionType;
  options: QuizOption[];
  correctOptionIds: string[];
  explanation: string;
  explanationEn?: string;
  points: number;
};

export type QuizDefinition = {
  id: string;
  slug: string;
  code: string;

  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;

  courseSlug: string;
  courseTitle: string;

  moduleSlug: string;
  moduleTitle: string;

  lessonId: string;
  lessonSlug: string;

  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;

  questions: QuizQuestion[];
};

export type QuizAnswers = Record<string, string[]>;

export type QuizAttempt = {
  id: string;
  userId: string;
  quizSlug: string;

  answers: QuizAnswers;

  scorePercent: number;
  correctAnswers: number;
  totalQuestions: number;

  passed: boolean;

  startedAt: string;
  submittedAt: string;
  durationSeconds: number;
};

export type QuizCorrectionItem = {
  question: QuizQuestion;
  selectedOptionIds: string[];
  isCorrect: boolean;
};

export type QuizResult = {
  attempt: QuizAttempt;
  corrections: QuizCorrectionItem[];
};
