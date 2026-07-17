export type AiProMode =
  | "explain"
  | "summarize"
  | "revision"
  | "quiz"
  | "case-study"
  | "study-plan"
  | "performance";

export type AiProContext = {
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  progressPercent?: number;
  lastQuizScore?: number | null;
  lastExamScore?: number | null;
  weakDomains?: string[];
};

export type AiProRequest = {
  locale?: "fr" | "en";
  mode: AiProMode;
  prompt: string;
  context: AiProContext;
};

export type AiProResponse = {
  title: string;
  content: string;
  suggestions: string[];
};
