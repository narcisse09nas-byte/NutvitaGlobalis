"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";

import { loadExamAttempts, saveExamAttempts } from "@/lib/exam-storage";

import type { ExamAttempt } from "@/types/exam";

type ExamContextValue = {
  attempts: ExamAttempt[];
  allAttempts: ExamAttempt[];
  isLoading: boolean;

  recordAttempt: (attempt: ExamAttempt) => void;

  getAttemptsByExam: (examSlug: string) => ExamAttempt[];

  getBestAttempt: (examSlug: string) => ExamAttempt | null;
};

export const ExamContext = createContext<ExamContextValue | null>(null);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useLocalAuth();

  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAttempts([]);
      setIsLoading(false);
      return;
    }

    const sync = () => setAttempts(loadExamAttempts(user.id));
    sync();
    window.addEventListener("nutvita-exam-attempts-updated", sync);

    setIsLoading(false);
    return () => window.removeEventListener("nutvita-exam-attempts-updated", sync);
  }, [user]);

  const recordAttempt = useCallback(
    (attempt: ExamAttempt) => {
      if (!user) {
        return;
      }

      setAttempts((current) => {
        const updated = [attempt, ...current];

        saveExamAttempts(user.id, updated);

        return updated;
      });
    },
    [user],
  );

  const getAttemptsByExam = useCallback(
    (examSlug: string) =>
      attempts.filter((attempt) => attempt.examSlug === examSlug),
    [attempts],
  );

  const getBestAttempt = useCallback(
    (examSlug: string) => {
      const examAttempts = attempts.filter((attempt) => attempt.resultVisibility !== "pending_review").filter(
        (attempt) => attempt.examSlug === examSlug,
      );

      if (examAttempts.length === 0) {
        return null;
      }

      return examAttempts.reduce((best, current) =>
        current.scorePercent > best.scorePercent ? current : best,
      );
    },
    [attempts],
  );

  const value = useMemo(
    () => ({
      attempts: attempts.filter((attempt) => attempt.resultVisibility !== "pending_review"),
      allAttempts: attempts,
      isLoading,
      recordAttempt,
      getAttemptsByExam,
      getBestAttempt,
    }),
    [attempts, isLoading, recordAttempt, getAttemptsByExam, getBestAttempt],
  );

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}
