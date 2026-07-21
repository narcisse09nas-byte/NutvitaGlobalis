import type { AcademyCourse } from "@/types/course";
import type { CertificationRequirement } from "@/types/certification";
import type { StudioCourse, StudioStoreData } from "@/types/instructor-studio";
import type { QuizDefinition } from "@/types/quiz";
import type { StudioFinalExam } from "@/types/instructor-studio";
import type { ExamQuestion } from "@/types/exam";

export function studioCourseToAcademyCourse(
  course: StudioCourse,
  locale: "fr" | "en" = "fr",
): AcademyCourse {
  const english = locale === "en";
  const minutes = course.modules.reduce(
    (total, module) =>
      total +
      module.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0),
    0,
  );
  return {
    id: course.id,
    slug: course.slug,
    code: course.code,
    title: english ? course.titleEn || course.title : course.title,
    titleFr: course.title,
    description: english
      ? course.descriptionEn || course.description
      : course.description,
    category: course.category,
    level: course.level,
    language: course.language,
    priceUsd: course.priceUsd,
    durationHours: Math.max(1, Math.ceil(minutes / 60)),
    progress: 0,
    enrolled: false,
    featured: false,
    applicationExercises: course.applicationExercises ?? [],
    modules: course.modules.map((module, index) => ({
      id: module.id,
      slug: module.slug,
      number: index + 1,
      title: english ? module.titleEn || module.title : module.title,
      titleEn: module.titleEn,
      description: english
        ? module.descriptionEn || module.description
        : module.description,
      estimatedMinutes: module.lessons.reduce(
        (sum, lesson) => sum + lesson.durationMinutes,
        0,
      ),
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: english ? lesson.titleEn || lesson.title : lesson.title,
        titleEn: lesson.titleEn,
        description: english
          ? lesson.contentEn || lesson.content
          : lesson.content,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        status: "available",
        videoUrl: english
          ? lesson.videoUrlEn || lesson.videoUrl
          : lesson.videoUrl,
        htmlUrl: english ? lesson.htmlUrlEn || lesson.htmlUrl : lesson.htmlUrl,
        quizSlug: course.quizzes.find((quiz) => quiz.lessonId === lesson.id)
          ?.slug,
        resourceUrl: english
          ? lesson.resourceUrlEn || lesson.resourceUrl
          : lesson.resourceUrl,
      })),
    })),
  };
}

export function localizeStudioQuiz(
  quiz: QuizDefinition,
  locale: "fr" | "en",
): QuizDefinition {
  if (locale === "fr") return quiz;
  return {
    ...quiz,
    title: quiz.titleEn || quiz.title,
    description: quiz.descriptionEn || quiz.description,
    questions: quiz.questions.map((question) => ({
      ...question,
      prompt: question.promptEn || question.prompt,
      explanation: question.explanationEn || question.explanation,
      options: question.options.map((option) => ({
        ...option,
        text: option.textEn || option.text,
      })),
    })),
  };
}

export function localizeStudioExam(
  bundle: StudioFinalExam,
  locale: "fr" | "en",
): StudioFinalExam {
  if (locale === "fr") return bundle;
  return {
    definition: {
      ...bundle.definition,
      title: bundle.definition.titleEn || bundle.definition.title,
      description:
        bundle.definition.descriptionEn || bundle.definition.description,
    },
    questions: localizeExamQuestions(bundle.questions, locale),
  };
}

export function localizeExamQuestions(
  questions: ExamQuestion[],
  locale: "fr" | "en",
): ExamQuestion[] {
  if (locale === "fr") return questions;
  return questions.map((question) => ({
    ...question,
    prompt: question.promptEn || question.prompt,
    caseText: question.caseTextEn || question.caseText,
    explanation: question.explanationEn || question.explanation,
    options: question.options?.map((option) => ({
      ...option,
      text: option.textEn || option.text,
    })),
  }));
}

export function getPublishedStudioCourses(data: StudioStoreData) {
  return data.courses.filter((course) => course.status === "published");
}

export function getStudioCourseBySlug(data: StudioStoreData, slug: string) {
  return (
    getPublishedStudioCourses(data).find((course) => course.slug === slug) ??
    null
  );
}

export function getStudioCertificationRequirement(
  course: StudioCourse,
): CertificationRequirement | null {
  if (!course.certification.enabled || !course.finalExam) return null;
  return {
    courseSlug: course.slug,
    requiredQuizSlugs: course.quizzes
      .filter((quiz) => quiz.allowProgressWithoutPassing === false)
      .map((quiz) => quiz.slug),
    requiredExamSlug: course.finalExam.definition.slug,
    minimumCourseProgress: course.certification.minimumCourseProgress,
  };
}
