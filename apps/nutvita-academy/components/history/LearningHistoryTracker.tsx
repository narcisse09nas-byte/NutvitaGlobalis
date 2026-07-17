"use client";

import { useEffect } from "react";

import type {
  LessonReference,
} from "@/types/learning-tools";

import { useLearningTools } from "@/hooks/use-learning-tools";

type LearningHistoryTrackerProps = {
  reference: LessonReference;
  videoTimeSeconds?: number;
};

export function LearningHistoryTracker({
  reference,
  videoTimeSeconds,
}: LearningHistoryTrackerProps) {
  const { addHistory } =
    useLearningTools();

  useEffect(() => {
    addHistory(
      reference,
      videoTimeSeconds
    );
  }, [
    addHistory,
    reference,
    videoTimeSeconds,
  ]);

  return null;
}