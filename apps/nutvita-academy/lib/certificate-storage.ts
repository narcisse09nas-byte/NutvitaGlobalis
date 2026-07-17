import type {
  CertificateRecord,
} from "@/types/certification";

const CERTIFICATE_STORAGE_KEY =
  "nutvita-certificates-registry";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadAllCertificates(): CertificateRecord[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const stored =
      localStorage.getItem(
        CERTIFICATE_STORAGE_KEY
      );

    if (!stored) {
      return [];
    }

    return JSON.parse(
      stored
    ) as CertificateRecord[];
  } catch {
    return [];
  }
}

export function saveAllCertificates(
  certificates: CertificateRecord[]
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    CERTIFICATE_STORAGE_KEY,
    JSON.stringify(certificates)
  );
}

export function loadUserCertificates(
  userId: string
): CertificateRecord[] {
  return loadAllCertificates().filter(
    (certificate) =>
      certificate.userId === userId
  );
}

export function findCertificateById(
  certificateId: string
): CertificateRecord | null {
  return (
    loadAllCertificates().find(
      (certificate) =>
        certificate.id ===
          certificateId ||
        certificate.certificateNumber ===
          certificateId
    ) ?? null
  );
}

export function saveCertificate(
  certificate: CertificateRecord
): CertificateRecord {
  const certificates =
    loadAllCertificates();

  const existingIndex =
    certificates.findIndex(
      (item) =>
        item.userId ===
          certificate.userId &&
        item.courseSlug ===
          certificate.courseSlug
    );

  if (existingIndex >= 0) {
    return certificates[
      existingIndex
    ];
  }

  const updated = [
    certificate,
    ...certificates,
  ];

  saveAllCertificates(updated);

  return certificate;
}