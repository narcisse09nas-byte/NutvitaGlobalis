"use client";

import {
  useMemo,
} from "react";

import { useCertificates } from "@/hooks/use-certificates";
import { useExam } from "@/hooks/use-exam";
import { useGamification } from "@/hooks/use-gamification";
import { useNotifications } from "@/hooks/use-notifications";
import { useProgress } from "@/hooks/use-progress";
import { useQuiz } from "@/hooks/use-quiz";
import { useMarketplace } from "@/hooks/use-marketplace";

import {
  buildStudentDashboard,
} from "@/lib/student-dashboard-engine";

export function useStudentDashboard() {
  const { data } =
    useProgress();
  const { courses, isEnrolled } = useMarketplace();

  const {
    attempts: quizAttempts,
  } = useQuiz();

  const {
    attempts: examAttempts,
  } = useExam();

  const { certificates } =
    useCertificates();

  const { profile } =
    useGamification();

  const { notifications } =
    useNotifications();

  return useMemo(
    () => {
      const allowed = new Set(courses.filter((course) => isEnrolled(course.slug)).map((course) => course.slug));
      const progressData = {
        ...data,
        lessons: Object.fromEntries(Object.entries(data.lessons).filter(([, lesson]) => allowed.has(lesson.courseSlug))),
        lastPositions: Object.fromEntries(Object.entries(data.lastPositions).filter(([slug]) => allowed.has(slug))),
        exams: Object.fromEntries(Object.entries(data.exams).filter(([slug]) => allowed.has(slug))),
      };
      return buildStudentDashboard({
        progressData,
        quizAttempts,
        examAttempts,
        certificates,
        gamificationProfile:
          profile,
        notifications,
      });
    },
    [
      data,
      courses,
      isEnrolled,
      quizAttempts,
      examAttempts,
      certificates,
      profile,
      notifications,
    ]
  );
}