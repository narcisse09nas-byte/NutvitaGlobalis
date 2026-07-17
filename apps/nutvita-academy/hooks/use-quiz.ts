"use client";

import { useContext } from "react";

import { QuizContext } from "@/components/quizzes/QuizProvider";

export function useQuiz() {
  const context =
    useContext(QuizContext);

  if (!context) {
    throw new Error(
      "useQuiz doit être utilisé dans QuizProvider."
    );
  }

  return context;
}