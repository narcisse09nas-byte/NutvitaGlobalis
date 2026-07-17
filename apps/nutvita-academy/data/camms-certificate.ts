import type { CertificateData } from "@/types/certificate";

export const cammsCertificate: CertificateData = {
  recipientName: "Paul Narcisse Zebaze",

  courseName:
    "CERTIFIED ACUTE MALNUTRITION MANAGEMENT SPECIALIST (CAMMS)",

  courseSubtitle:
    "Prise en charge communautaire de la malnutrition aiguë",

  certificateId: "CAMMS-2026-0001",

  completionDate: "20 Mai 2026",

  directorName: "Paul N.",

  verificationUrl:
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/certificates/verify/CAMMS-2026-0001`,
};
