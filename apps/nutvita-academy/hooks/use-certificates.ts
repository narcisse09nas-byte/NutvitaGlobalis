"use client";

import { useContext } from "react";

import { CertificateContext } from "@/components/certification/CertificateProvider";

export function useCertificates() {
  const context =
    useContext(
      CertificateContext
    );

  if (!context) {
    throw new Error(
      "useCertificates doit être utilisé dans CertificateProvider."
    );
  }

  return context;
}