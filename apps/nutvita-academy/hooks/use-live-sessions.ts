"use client";

import { useContext } from "react";

import { LiveSessionContext } from "@/components/live/LiveSessionProvider";

export function useLiveSessions() {
  const context =
    useContext(
      LiveSessionContext
    );

  if (!context) {
    throw new Error(
      "useLiveSessions doit être utilisé dans LiveSessionProvider."
    );
  }

  return context;
}
