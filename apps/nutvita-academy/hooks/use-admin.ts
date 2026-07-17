"use client";

import { useContext } from "react";

import { AdminContext } from "@/components/admin/AdminProvider";

export function useAdmin() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error(
      "useAdmin doit être utilisé dans AdminProvider."
    );
  }

  return context;
}
