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

import {
  buildStudentDashboard,
} from "@/lib/student-dashboard-engine";

export function useStudentDashboard() {
  const { data } =
    useProgress();

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
    () =>
      buildStudentDashboard({
        progressData: data,
        quizAttempts,
        examAttempts,
        certificates,
        gamificationProfile:
          profile,
        notifications,
      }),
    [
      data,
      quizAttempts,
      examAttempts,
      certificates,
      profile,
      notifications,
    ]
  );
}