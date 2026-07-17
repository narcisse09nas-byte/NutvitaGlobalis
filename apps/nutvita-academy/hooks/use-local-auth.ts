"use client";

import { useContext } from "react";

import { LocalAuthContext } from "@/components/auth/LocalAuthProvider";

export function useLocalAuth() {
  const context = useContext(
    LocalAuthContext
  );

  if (!context) {
    throw new Error(
      "useLocalAuth doit être utilisé dans LocalAuthProvider."
    );
  }

  return context;
}