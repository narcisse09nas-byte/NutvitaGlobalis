"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";

import {
  loadUserCertificates,
  saveCertificate,
} from "@/lib/certificate-storage";

import type {
  CertificateRecord,
} from "@/types/certification";

type CertificateContextValue = {
  certificates: CertificateRecord[];
  isLoading: boolean;

  issueCertificate: (
    certificate: CertificateRecord
  ) => CertificateRecord;

  getCertificateById: (
    certificateId: string
  ) => CertificateRecord | null;

  refreshCertificates: () => void;
};

export const CertificateContext =
  createContext<CertificateContextValue | null>(
    null
  );

export function CertificateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useLocalAuth();

  const [
    certificates,
    setCertificates,
  ] = useState<CertificateRecord[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const refreshCertificates =
    useCallback(() => {
      if (!user) {
        setCertificates([]);
        setIsLoading(false);
        return;
      }

      setCertificates(
        loadUserCertificates(
          user.id
        )
      );

      setIsLoading(false);
    }, [user]);

  useEffect(() => {
    refreshCertificates();
  }, [refreshCertificates]);

  const issueCertificate =
    useCallback(
      (
        certificate:
          CertificateRecord
      ) => {
        const saved =
          saveCertificate(
            certificate
          );

        refreshCertificates();

        return saved;
      },
      [refreshCertificates]
    );

  const getCertificateById =
    useCallback(
      (
        certificateId: string
      ) => {
        return (
          certificates.find(
            (certificate) =>
              certificate.id ===
                certificateId ||
              certificate
                .certificateNumber ===
                certificateId
          ) ?? null
        );
      },
      [certificates]
    );

  const value = useMemo(
    () => ({
      certificates,
      isLoading,
      issueCertificate,
      getCertificateById,
      refreshCertificates,
    }),
    [
      certificates,
      isLoading,
      issueCertificate,
      getCertificateById,
      refreshCertificates,
    ]
  );

  return (
    <CertificateContext.Provider
      value={value}
    >
      {children}
    </CertificateContext.Provider>
  );
}