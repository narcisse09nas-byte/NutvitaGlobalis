"use client";

import { useContext } from "react";

import { ResourceContext } from "@/components/resources/ResourceProvider";

export function useResources() {
  const context =
    useContext(ResourceContext);

  if (!context) {
    throw new Error(
      "useResources doit être utilisé dans ResourceProvider."
    );
  }

  return context;
}