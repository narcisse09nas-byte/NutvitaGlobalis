"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";

import { loadQuizAttempts, saveQuizAttempts } from "@/lib/quiz-storage";

import type { QuizAttempt } from "@/types/quiz";

type QuizContextValue = {
  attempts: QuizAttempt[];
  isLoading: boolean;

  recordAttempt: (attempt: QuizAttempt) => void;

  getQuizAttempts: (quizSlug: string) => QuizAttempt[];

  getBestAttempt: (quizSlug: string) => QuizAttempt | null;

  clearQuizHistory: () => void;
};

export const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const { user } = useLocalAuth();

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAttempts([]);
      setIsLoading(false);
      return;
    }

    setAttempts(loadQuizAttempts(user.id));

    setIsLoading(false);
  }, [user]);

  const recordAttempt = useCallback(
    (attempt: QuizAttempt) => {
      if (!user) {
        return;
      }

      setAttempts((current) => {
        const updated = [attempt, ...current];

        saveQuizAttempts(user.id, updated);

        return updated;
      });
    },
    [user],
  );

  const getQuizAttempts = useCallback(
    (quizSlug: string) => {
      return attempts.filter((attempt) => attempt.quizSlug === quizSlug);
    },
    [attempts],
  );

  const getBestAttempt = useCallback(
    (quizSlug: string) => {
      const quizAttempts = attempts.filter(
        (attempt) => attempt.quizSlug === quizSlug,
      );

      if (quizAttempts.length === 0) {
        return null;
      }

      return quizAttempts.reduce((best, current) =>
        current.scorePercent > best.scorePercent ? current : best,
      );
    },
    [attempts],
  );

  const clearQuizHistory = useCallback(() => {
    if (!user) {
      return;
    }

    setAttempts([]);

    saveQuizAttempts(user.id, []);
  }, [user]);

  const value = useMemo(
    () => ({
      attempts,
      isLoading,
      recordAttempt,
      getQuizAttempts,
      getBestAttempt,
      clearQuizHistory,
    }),
    [
      attempts,
      isLoading,
      recordAttempt,
      getQuizAttempts,
      getBestAttempt,
      clearQuizHistory,
    ],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}
