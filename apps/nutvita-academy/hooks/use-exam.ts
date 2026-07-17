"use client";

import { useContext } from "react";

import { ExamContext } from "@/components/exams/ExamProvider";

export function useExam() {
  const context =
    useContext(ExamContext);

  if (!context) {
    throw new Error(
      "useExam doit être utilisé dans ExamProvider."
    );
  }

  return context;
}