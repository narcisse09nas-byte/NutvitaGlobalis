export type AiMessageRole =
  | "user"
  | "assistant";

export type AiInstructorContext = {
  courseSlug?: string;
  courseTitle?: string;

  moduleSlug?: string;
  moduleTitle?: string;

  lessonSlug?: string;
  lessonTitle?: string;

  progressPercent?: number;
  lastQuizScore?: number;
  lastExamScore?: number;
};

export type AiInstructorMessage = {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
};

export type AiInstructorConversation = {
  id: string;
  userId: string;
  context: AiInstructorContext;
  messages: AiInstructorMessage[];
  updatedAt: string;
};

export type AiKnowledgeItem = {
  id: string;
  keywords: string[];
  title: string;
  answer: string;
  recommendation?: string;
};