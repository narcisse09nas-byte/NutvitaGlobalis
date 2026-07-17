import type { StudioCourse, StudioStoreData } from "@/types/instructor-studio";

const KEY = "nutvita-instructor-studio";
const browser = () => typeof window !== "undefined";

export function createStudioId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createStudioSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function emptyStudioStore(): StudioStoreData {
  return { version: 4, courses: [] };
}

export function normalizeStudioCourse(course: StudioCourse): StudioCourse {
  return {
    ...course,
    titleEn: course.titleEn ?? "",
    subtitleEn: course.subtitleEn ?? "",
    descriptionEn: course.descriptionEn ?? "",
    contentLanguages:
      course.contentLanguages?.length > 0
        ? course.contentLanguages
        : ["fr", "en"],
    modules: (course.modules ?? []).map((module) => ({
      ...module,
      titleEn: module.titleEn ?? "",
      description: module.description ?? "",
      descriptionEn: module.descriptionEn ?? "",
      lessons: (module.lessons ?? []).map((lesson) => ({
        ...lesson,
        titleEn: lesson.titleEn ?? "",
        content: lesson.content ?? "",
        contentEn: lesson.contentEn ?? "",
        videoUrlEn: lesson.videoUrlEn,
        htmlUrl: lesson.htmlUrl,
        htmlUrlEn: lesson.htmlUrlEn,
        resourceUrlEn: lesson.resourceUrlEn,
      })),
    })),
    quizzes: (course.quizzes ?? []).map((quiz) => ({
      ...quiz,
      titleEn: quiz.titleEn ?? "",
      descriptionEn: quiz.descriptionEn ?? "",
      questions: quiz.questions.map((question) => ({
        ...question,
        promptEn: question.promptEn ?? "",
        explanationEn: question.explanationEn ?? "",
        options: question.options.map((option) => ({
          ...option,
          textEn: option.textEn ?? "",
        })),
      })),
    })),
    finalExam: course.finalExam
      ? {
          definition: {
            ...course.finalExam.definition,
            passingScore: 70,
            maxAttempts: 3,
            blueprint: course.finalExam.definition.blueprint ?? {
              qcmCount: 50,
              qcuCount: 35,
              caseStudyCount: 15,
            },
            retakeDelayDays:
              course.finalExam.definition.retakeDelayDays ?? [7, 21],
            titleEn: course.finalExam.definition.titleEn ?? "",
            descriptionEn: course.finalExam.definition.descriptionEn ?? "",
          },
          questions: course.finalExam.questions.map((question) => ({
            ...question,
            promptEn: question.promptEn ?? "",
            explanationEn: question.explanationEn ?? "",
            options: question.options?.map((option) => ({
              ...option,
              textEn: option.textEn ?? "",
            })),
          })),
        }
      : null,
    reviewNotes: course.reviewNotes ?? "",
    certification: {
      enabled: course.certification?.enabled ?? false,
      minimumCourseProgress: course.certification?.minimumCourseProgress ?? 100,
      academicDirector:
        course.certification?.academicDirector ?? "NutVitaGlobalis Academy",
      proctoredExam: course.certification?.proctoredExam ?? true,
      minimumBookingLeadDays: course.certification?.minimumBookingLeadDays ?? 7,
      maximumCandidatesPerRoom:
        course.certification?.maximumCandidatesPerRoom ?? 10,
      identityThreshold: course.certification?.identityThreshold ?? 85,
    },
  };
}

export function loadStudioStore(): StudioStoreData {
  if (!browser()) return emptyStudioStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStudioStore();
    const parsed = JSON.parse(raw) as StudioStoreData;
    return {
      version: 4,
      courses: (parsed.courses ?? []).map(normalizeStudioCourse),
    };
  } catch {
    return emptyStudioStore();
  }
}

export function saveStudioStore(data: StudioStoreData) {
  if (browser())
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: 4 }));
}

export function createStudioCourse(input: {
  instructorUserId: string;
  title: string;
  titleEn?: string;
  code: string;
}): StudioCourse {
  const now = new Date().toISOString();
  return {
    id: createStudioId("course"),
    code: input.code.trim().toUpperCase(),
    slug: createStudioSlug(input.title),
    title: input.title.trim(),
    titleEn: input.titleEn?.trim() ?? "",
    subtitle: "",
    subtitleEn: "",
    description: "",
    descriptionEn: "",
    category: "Nutrition",
    language: "Français",
    contentLanguages: ["fr", "en"],
    level: "Professionnel",
    priceUsd: 0,
    status: "draft",
    instructorUserId: input.instructorUserId,
    modules: [],
    quizzes: [],
    finalExam: null,
    certification: {
      enabled: false,
      minimumCourseProgress: 100,
      academicDirector: "NutVitaGlobalis Academy",
      proctoredExam: true,
      minimumBookingLeadDays: 7,
      maximumCandidatesPerRoom: 10,
      identityThreshold: 85,
    },
    reviewNotes: "",
    createdAt: now,
    updatedAt: now,
  };
}
