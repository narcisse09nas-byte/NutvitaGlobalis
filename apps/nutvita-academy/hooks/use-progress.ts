"use client";

import { useContext } from "react";

import { ProgressContext } from "@/components/progress/ProgressProvider";

export function useProgress() {
  const context = useContext(
    ProgressContext
  );

  if (!context) {
    throw new Error(
      "useProgress doit être utilisé dans ProgressProvider."
    );
  }

  return context;
}