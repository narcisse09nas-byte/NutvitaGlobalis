"use client";

import { useContext } from "react";

import { InstructorStudioContext } from "@/components/instructor/InstructorStudioProvider";

export function useInstructorStudio() {
  const context =
    useContext(InstructorStudioContext);

  if (!context) {
    throw new Error(
      "useInstructorStudio doit être utilisé dans InstructorStudioProvider."
    );
  }

  return context;
}
