"use client";

import { useContext } from "react";

import { BillingContext } from "@/components/billing/BillingProvider";

export function useBilling() {
  const context =
    useContext(BillingContext);

  if (!context) {
    throw new Error(
      "useBilling doit être utilisé dans BillingProvider."
    );
  }

  return context;
}
