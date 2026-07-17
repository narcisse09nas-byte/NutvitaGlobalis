"use client";

import { useContext } from "react";
import { ProctoringContext } from "@/components/proctoring/ProctoringProvider";

export function useProctoring() {
  const context = useContext(ProctoringContext);
  if (!context) throw new Error("useProctoring doit être utilisé dans ProctoringProvider.");
  return context;
}
