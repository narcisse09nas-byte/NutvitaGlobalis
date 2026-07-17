"use client";

import { useContext } from "react";

import { GamificationContext } from "@/components/gamification/GamificationProvider";

export function useGamification() {
  const context =
    useContext(
      GamificationContext
    );

  if (!context) {
    throw new Error(
      "useGamification doit être utilisé dans GamificationProvider."
    );
  }

  return context;
}