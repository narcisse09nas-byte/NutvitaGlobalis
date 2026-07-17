"use client";

import { useContext } from "react";

import { AiInstructorContextStore } from "@/components/ai/AiInstructorProvider";

export function useAiInstructor() {
  const context =
    useContext(
      AiInstructorContextStore
    );

  if (!context) {
    throw new Error(
      "useAiInstructor doit être utilisé dans AiInstructorProvider."
    );
  }

  return context;
}