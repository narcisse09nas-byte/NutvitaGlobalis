"use client";

import {
  createContext,
  useMemo,
} from "react";

import { useCertificates } from "@/hooks/use-certificates";
import { useExam } from "@/hooks/use-exam";
import { useProgress } from "@/hooks/use-progress";
import { useQuiz } from "@/hooks/use-quiz";

import {
  calculateGamificationProfile,
} from "@/lib/gamification-engine";

import type {
  GamificationProfile,
} from "@/types/gamification";

type GamificationContextValue = {
  profile: GamificationProfile;
};

export const GamificationContext =
  createContext<GamificationContextValue | null>(
    null
  );

export function GamificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const profile = useMemo(
    () =>
      calculateGamificationProfile({
        progressData: data,
        quizAttempts,
        examAttempts,
        certificates,
      }),
    [
      data,
      quizAttempts,
      examAttempts,
      certificates,
    ]
  );

  const value = useMemo(
    () => ({
      profile,
    }),
    [profile]
  );

  return (
    <GamificationContext.Provider
      value={value}
    >
      {children}
    </GamificationContext.Provider>
  );
}