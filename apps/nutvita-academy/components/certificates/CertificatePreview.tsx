"use client";

import { LockKeyhole } from "lucide-react";
import { cammsCertificate } from "@/data/camms-certificate";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useProgress } from "@/hooks/use-progress";
import { DynamicCertificate } from "./DynamicCertificate";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/hooks/use-language";

export function CertificatePreview() {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();
  const { getExamProgress } = useProgress();
  const exam = getExamProgress("camms");

  if (!user || !exam?.passed) {
    return <Card className="mx-auto max-w-2xl text-center"><LockKeyhole className="mx-auto text-[#F58220]" size={46}/>
      <h2 className="mt-5 text-3xl font-extrabold text-[#063D2E]">{text("Certificat verrouillé", "Certificate locked")}</h2>
      <p className="mt-4 text-slate-600">{text("Le certificat sera généré après validation de l’examen final avec un score minimum de 70 %.", "The certificate will be generated after passing the final exam with a minimum score of 70%.")}</p>
      <Button href="/dashboard/exams/camms-final" variant="secondary" className="mt-6">{text("Accéder à l’examen", "Go to exam")}</Button>
    </Card>;
  }

  const passedDate = new Date(exam.passedAt ?? exam.lastAttemptAt);
  const completionDate = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "long", year: "numeric" }).format(passedDate);
  const certificateId = `CAMMS-${passedDate.getFullYear()}-${user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/certificates/verify/${certificateId}`;
  return <DynamicCertificate data={{ ...cammsCertificate, recipientName: user.fullName, completionDate, certificateId, verificationUrl }} />;
}
