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
  createEmptyProgressData,
  createLessonProgress,
  getLessonProgressKey,
  loadStudentProgress,
  saveStudentProgress,
  updateLastCoursePosition,
} from "@/lib/local-progress";

import type {
  CourseLearningPosition,
  LessonProgress,
  ExamProgress,
  ProgressSummary,
  StudentProgressData,
} from "@/types/progress";

type RegisterLessonVisitInput = {
  lessonId: string;
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
};

type UpdateLessonInput =
  RegisterLessonVisitInput & {
    progressPercent?: number;
    lastPositionSeconds?: number;
    additionalTimeSeconds?: number;
  };

type ProgressContextValue = {
  data: StudentProgressData;
  isLoading: boolean;

  registerLessonVisit: (
    input: RegisterLessonVisitInput
  ) => void;

  updateLessonProgress: (
    input: UpdateLessonInput
  ) => void;

  completeLesson: (
    input: RegisterLessonVisitInput
  ) => void;

  getLessonProgress: (
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ) => LessonProgress | null;

  getLastPosition: (
    courseSlug: string
  ) => CourseLearningPosition | null;

  getCourseSummary: (
    courseSlug: string,
    lessonIds: string[]
  ) => ProgressSummary;

  resetProgress: () => void;
  recordExamAttempt: (courseSlug: string, score: number, total: number) => ExamProgress;
  getExamProgress: (courseSlug: string) => ExamProgress | null;
};

export const ProgressContext =
  createContext<ProgressContextValue | null>(
    null
  );

export function ProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useLocalAuth();

  const [data, setData] =
    useState<StudentProgressData>(
      createEmptyProgressData()
    );

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setData(user ? loadStudentProgress(user.id) : createEmptyProgressData());
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [user]);

  const persist = useCallback(
    (
      updater: (
        current: StudentProgressData
      ) => StudentProgressData
    ) => {
      if (!user) {
        return;
      }

      setData((current) => {
        const updated = updater(current);

        saveStudentProgress(
          user.id,
          updated
        );

        return updated;
      });
    },
    [user]
  );

  const registerLessonVisit = useCallback(
    (
      input: RegisterLessonVisitInput
    ) => {
      persist((current) => {
        const key = getLessonProgressKey(
          input.courseSlug,
          input.moduleSlug,
          input.lessonSlug
        );

        const now = new Date().toISOString();

        const existing =
          current.lessons[key];

        const lessonProgress: LessonProgress =
          existing
            ? {
                ...existing,
                status:
                  existing.status ===
                  "completed"
                    ? "completed"
                    : "in_progress",
                lastVisitedAt: now,
              }
            : createLessonProgress(input);

        const withLesson: StudentProgressData = {
          ...current,
          lessons: {
            ...current.lessons,
            [key]: lessonProgress,
          },
        };

        return updateLastCoursePosition(
          withLesson,
          {
            courseSlug: input.courseSlug,
            moduleSlug: input.moduleSlug,
            lessonSlug: input.lessonSlug,
            updatedAt: now,
          }
        );
      });
    },
    [persist]
  );

  const updateLessonProgress = useCallback(
    (
      input: UpdateLessonInput
    ) => {
      persist((current) => {
        const key = getLessonProgressKey(
          input.courseSlug,
          input.moduleSlug,
          input.lessonSlug
        );

        const existing =
          current.lessons[key] ??
          createLessonProgress(input);

        const progressPercent = Math.min(
          100,
          Math.max(
            0,
            input.progressPercent ??
              existing.progressPercent
          )
        );

        const completed =
          progressPercent >= 95 ||
          existing.status === "completed";

        const now = new Date().toISOString();

        const updatedLesson: LessonProgress = {
          ...existing,
          status: completed
            ? "completed"
            : "in_progress",
          progressPercent: completed
            ? 100
            : progressPercent,
          lastPositionSeconds:
            input.lastPositionSeconds ??
            existing.lastPositionSeconds,
          timeSpentSeconds:
            existing.timeSpentSeconds +
            Math.max(
              0,
              input.additionalTimeSeconds ?? 0
            ),
          lastVisitedAt: now,
          completedAt: completed
            ? existing.completedAt ?? now
            : undefined,
        };

        const withLesson: StudentProgressData = {
          ...current,
          lessons: {
            ...current.lessons,
            [key]: updatedLesson,
          },
        };

        return updateLastCoursePosition(
          withLesson,
          {
            courseSlug: input.courseSlug,
            moduleSlug: input.moduleSlug,
            lessonSlug: input.lessonSlug,
            updatedAt: now,
          }
        );
      });
    },
    [persist]
  );

  const completeLesson = useCallback(
    (
      input: RegisterLessonVisitInput
    ) => {
      updateLessonProgress({
        ...input,
        progressPercent: 100,
      });
    },
    [updateLessonProgress]
  );

  const getLessonProgress = useCallback(
    (
      courseSlug: string,
      moduleSlug: string,
      lessonSlug: string
    ) => {
      const key = getLessonProgressKey(
        courseSlug,
        moduleSlug,
        lessonSlug
      );

      return data.lessons[key] ?? null;
    },
    [data.lessons]
  );

  const getLastPosition = useCallback(
    (courseSlug: string) => {
      return (
        data.lastPositions[
          courseSlug
        ] ?? null
      );
    },
    [data.lastPositions]
  );

  const getCourseSummary = useCallback(
    (
      courseSlug: string,
      lessonIds: string[]
    ): ProgressSummary => {
      const courseLessons =
        Object.values(data.lessons).filter(
          (lesson) =>
            lesson.courseSlug === courseSlug &&
            lessonIds.includes(
              lesson.lessonId
            )
        );

      const completedLessons =
        courseLessons.filter(
          (lesson) =>
            lesson.status === "completed"
        ).length;

      const startedLessons =
        courseLessons.filter(
          (lesson) =>
            lesson.status === "in_progress"
        ).length;

      const totalLessons =
        lessonIds.length;

      const progressPercent =
        totalLessons === 0
          ? 0
          : Math.round(
              (completedLessons /
                totalLessons) *
                100
            );

      const totalTimeSeconds =
        courseLessons.reduce(
          (total, lesson) =>
            total +
            lesson.timeSpentSeconds,
          0
        );

      return {
        totalLessons,
        completedLessons,
        startedLessons,
        progressPercent,
        totalTimeSeconds,
      };
    },
    [data.lessons]
  );

  const recordExamAttempt = useCallback((courseSlug: string, score: number, total: number) => {
    const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
    const passed = percentage >= 70;
    const now = new Date().toISOString();
    let result: ExamProgress = {
      courseSlug, score, total, percentage, passed, attempts: 1, lastAttemptAt: now,
      passedAt: passed ? now : undefined,
    };
    persist((current) => {
      const previous = current.exams[courseSlug];
      result = {
        ...result,
        attempts: (previous?.attempts ?? 0) + 1,
        passed: passed || previous?.passed === true,
        passedAt: previous?.passedAt ?? (passed ? now : undefined),
      };
      return { ...current, exams: { ...current.exams, [courseSlug]: result } };
    });
    return result;
  }, [persist]);

  const getExamProgress = useCallback(
    (courseSlug: string) => data.exams[courseSlug] ?? null,
    [data.exams],
  );

  const resetProgress = useCallback(() => {
    if (!user) {
      return;
    }

    const empty =
      createEmptyProgressData();

    saveStudentProgress(
      user.id,
      empty
    );

    setData(empty);
  }, [user]);

  const value = useMemo(
    () => ({
      data,
      isLoading,
      registerLessonVisit,
      updateLessonProgress,
      completeLesson,
      getLessonProgress,
      getLastPosition,
      getCourseSummary,
      recordExamAttempt,
      getExamProgress,
      resetProgress,
    }),
    [
      data,
      isLoading,
      registerLessonVisit,
      updateLessonProgress,
      completeLesson,
      getLessonProgress,
      getLastPosition,
      getCourseSummary,
      recordExamAttempt,
      getExamProgress,
      resetProgress,
    ]
  );

  return (
    <ProgressContext.Provider
      value={value}
    >
      {children}
    </ProgressContext.Provider>
  );
}
