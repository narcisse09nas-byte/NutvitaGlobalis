"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import {
  createStudioCourse,
  emptyStudioStore,
  loadStudioStore,
  normalizeStudioCourse,
  saveStudioStore,
} from "@/lib/instructor-storage";
import type {
  StudioCourse,
  StudioCourseStatus,
  StudioStoreData,
} from "@/types/instructor-studio";
import { useLanguage } from "@/hooks/use-language";
import { CERTIFICATION_EXAM_BLUEPRINT, getQuestionPoolCapacity } from "@/lib/exam-engine";

type ActionResult = { success: boolean; error?: string };

export function validateStudioCourse(course: StudioCourse): string[] {
  const errors: string[] = [];
  const requiresFrench = course.contentLanguages.includes("fr");
  const requiresEnglish = course.contentLanguages.includes("en");
  if (course.contentLanguages.length === 0)
    errors.push("Sélectionnez au moins une langue de publication. / Select at least one publication language.");
  if (requiresFrench && (!course.title.trim() || !course.description.trim()))
    errors.push("Le titre et la description en français sont obligatoires. / The French title and description are required.");
  if (
    requiresEnglish &&
    (!course.titleEn.trim() || !course.descriptionEn.trim())
  )
    errors.push("The English title and description are required.");
  if (course.modules.length === 0) errors.push("Ajoutez au moins un module.");
  if (course.modules.some((module) => module.lessons.length === 0))
    errors.push("Chaque module doit contenir au moins une leçon. / Every module must contain at least one lesson.");
  if (
    requiresFrench &&
    course.modules.some(
      (module) =>
        !module.title.trim() ||
        module.lessons.some(
          (lesson) => !lesson.title.trim() || !lesson.content.trim(),
        ),
    )
  )
    errors.push(
      "Complétez les titres et contenus français des modules et leçons. / Complete the French titles and content for all modules and lessons.",
    );
  if (
    requiresEnglish &&
    course.modules.some(
      (module) =>
        !module.titleEn.trim() ||
        module.lessons.some(
          (lesson) => !lesson.titleEn.trim() || !lesson.contentEn.trim(),
        ),
    )
  )
    errors.push("Complete all English module and lesson content.");
  if (
    course.modules.some((module) =>
      module.lessons.some(
        (lesson) =>
          lesson.type === "video" &&
          ((requiresFrench && !lesson.videoUrl) ||
            (requiresEnglish && !lesson.videoUrlEn)),
      ),
    )
  )
    errors.push("Chaque langue publiée doit disposer de sa vidéo de leçon. / Every published language needs its lesson video.");
  if (
    course.modules.some((module) =>
      module.lessons.some(
        (lesson) =>
          lesson.type === "interactive-html" &&
          ((requiresFrench && !lesson.htmlUrl) ||
            (requiresEnglish && !lesson.htmlUrlEn)),
      ),
    )
  )
    errors.push(
      "Chaque langue publiée doit disposer de son document HTML interactif / Each published language needs its interactive HTML document.",
    );
  if (
    course.modules.some((module) => {
      const learningSteps = module.lessons.filter(
        (lesson) => lesson.type !== "resource",
      );
      return learningSteps.some((lesson, index) => {
        const previousTypes = new Set(
          learningSteps.slice(0, index).map((item) => item.type),
        );
        if (lesson.type === "case-study")
          return (
            !previousTypes.has("video") ||
            !previousTypes.has("interactive-html")
          );
        if (lesson.type === "quiz")
          return (
            !previousTypes.has("video") ||
            !previousTypes.has("interactive-html") ||
            !previousTypes.has("case-study")
          );
        return false;
      });
    })
  )
    errors.push(
      "Ordre requis : vidéo → HTML interactif → cas pratique → quiz. Les ressources peuvent être placées partout / Required order: video → interactive HTML → case study → quiz. Resources may appear anywhere.",
    );
  if (course.quizzes.some((quiz) => quiz.questions.length === 0))
    errors.push("Chaque quiz doit contenir au moins une question.");
  if (
    requiresEnglish &&
    course.quizzes.some(
      (quiz) =>
        !quiz.titleEn?.trim() ||
        quiz.questions.some(
          (question) =>
            !question.promptEn?.trim() ||
            question.options.some((option) => !option.textEn?.trim()),
        ),
    )
  )
    errors.push(
      "Complete the English version of every quiz and answer option.",
    );
  if (
    course.certification.enabled &&
    (!course.finalExam || course.finalExam.questions.length === 0)
  )
    errors.push("Une formation certifiante doit contenir un examen final.");
  if (course.certification.enabled && course.finalExam) {
    const capacity = getQuestionPoolCapacity(course.finalExam.questions);
    if (
      capacity.qcm < CERTIFICATION_EXAM_BLUEPRINT.qcmCount ||
      capacity.qcu < CERTIFICATION_EXAM_BLUEPRINT.qcuCount ||
      capacity.case_study < CERTIFICATION_EXAM_BLUEPRINT.caseStudyCount
    )
      errors.push(
        "La banque finale doit contenir au minimum 50 QCM, 35 QCU et 15 cas pratiques / The final bank must contain at least 50 MCQ, 35 SCQ and 15 case studies.",
      );
  }
  if (
    requiresEnglish &&
    course.finalExam?.questions.some(
      (question) =>
        !question.promptEn?.trim() ||
        question.options?.some((option) => !option.textEn?.trim()),
    )
  )
    errors.push("Complete the English final exam question bank.");
  return errors;
}

type InstructorStudioContextValue = {
  data: StudioStoreData;
  createCourse: (input: {
    title: string;
    titleEn?: string;
    code: string;
  }) => StudioCourse | null;
  updateCourse: (
    courseId: string,
    patch: Partial<StudioCourse>,
  ) => ActionResult;
  updateStatus: (courseId: string, status: StudioCourseStatus) => ActionResult;
  deleteCourse: (courseId: string) => ActionResult;
  canManageCourse: (course: StudioCourse) => boolean;
};

export const InstructorStudioContext =
  createContext<InstructorStudioContextValue | null>(null);

export function InstructorStudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { text } = useLanguage();
  const { user } = useLocalAuth();
  const [data, setData] = useState<StudioStoreData>(emptyStudioStore());

  const syncCourse = useCallback((course: StudioCourse) => {
    void fetch("/api/studio/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(course),
    });
  }, []);

  useEffect(() => {
    setData(loadStudioStore());
    void fetch("/api/studio/courses", { cache: "no-store" }).then(
      async (response) => {
        if (!response.ok) return;
        const remote = (await response.json()) as StudioStoreData;
        const normalized: StudioStoreData = {
          version: 4,
          courses: remote.courses.map(normalizeStudioCourse),
        };
        setData(normalized);
        saveStudioStore(normalized);
      },
    );
  }, []);

  const persist = useCallback(
    (updater: (current: StudioStoreData) => StudioStoreData) => {
      setData((current) => {
        const updated = updater(current);
        saveStudioStore(updated);
        return updated;
      });
    },
    [],
  );

  const canManageCourse = useCallback(
    (course: StudioCourse) => {
      if (!user) return false;
      return (
        user.role === "admin" ||
        user.role === "super_admin" ||
        course.instructorUserId === user.id
      );
    },
    [user],
  );

  const createCourse = useCallback(
    (input: { title: string; titleEn?: string; code: string }) => {
      if (!user || !["instructor", "admin", "super_admin"].includes(user.role))
        return null;
      const course = createStudioCourse({
        ...input,
        instructorUserId: user.id,
        creatorRole: user.role as "instructor" | "admin" | "super_admin",
      });
      persist((current) => ({
        ...current,
        courses: [course, ...current.courses],
      }));
      syncCourse(course);
      return course;
    },
    [persist, syncCourse, user],
  );

  const updateCourse = useCallback(
    (courseId: string, patch: Partial<StudioCourse>): ActionResult => {
      const current = data.courses.find((course) => course.id === courseId);
      if (!current || !canManageCourse(current))
        return { success: false, error: text("Action non autorisée.", "Unauthorized action.") };
      const canAssign = user?.role === "admin" || user?.role === "super_admin";
      const instructorUserId = canAssign && patch.instructorUserId
        ? patch.instructorUserId
        : current.instructorUserId;
      persist((store) => ({
        ...store,
        courses: store.courses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                ...patch,
                id: course.id,
                instructorUserId,
                updatedAt: new Date().toISOString(),
              }
            : course,
        ),
      }));
      syncCourse({
        ...current,
        ...patch,
        id: current.id,
        instructorUserId,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    },
    [canManageCourse, data.courses, persist, syncCourse, text, user?.role],
  );

  const updateStatus = useCallback(
    (courseId: string, status: StudioCourseStatus): ActionResult => {
      const course = data.courses.find((item) => item.id === courseId);
      if (!course || !canManageCourse(course))
        return { success: false, error: text("Action non autorisée.", "Unauthorized action.") };
      if (
        status === "published" &&
        user?.role !== "admin" &&
        user?.role !== "super_admin"
      ) {
        return {
          success: false,
          error:
            text(
              "Seul un administrateur peut publier. Soumettez la formation en révision.",
              "Only an administrator can publish. Submit the course for review.",
            ),
        };
      }
      if (status === "published") {
        const errors = validateStudioCourse(course);
        if (errors.length > 0)
          return { success: false, error: errors.join(" ") };
      }
      return updateCourse(courseId, {
        status,
        publishedAt:
          status === "published"
            ? new Date().toISOString()
            : course.publishedAt,
      });
    },
    [canManageCourse, data.courses, text, updateCourse, user?.role],
  );

  const deleteCourse = useCallback(
    (courseId: string): ActionResult => {
      const course = data.courses.find((item) => item.id === courseId);
      if (!course || !canManageCourse(course))
        return { success: false, error: text("Action non autorisée.", "Unauthorized action.") };
      persist((store) => ({
        ...store,
        courses: store.courses.filter((item) => item.id !== courseId),
      }));
      return { success: true };
    },
    [canManageCourse, data.courses, persist, text],
  );

  const value = useMemo(
    () => ({
      data,
      createCourse,
      updateCourse,
      updateStatus,
      deleteCourse,
      canManageCourse,
    }),
    [
      data,
      createCourse,
      updateCourse,
      updateStatus,
      deleteCourse,
      canManageCourse,
    ],
  );

  return (
    <InstructorStudioContext.Provider value={value}>
      {children}
    </InstructorStudioContext.Provider>
  );
}
