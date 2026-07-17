"use client";

import Link from "next/link";

import {
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

import { useCertificates } from "@/hooks/use-certificates";

import { DynamicCertificate } from "@/components/certificates/DynamicCertificate";

export function CertificateDetailClient({
  certificateId,
}: {
  certificateId: string;
}) {
  const {
    getCertificateById,
    isLoading,
  } = useCertificates();

  if (isLoading) {
    return (
      <div className="p-10">
        Chargement du certificat...
      </div>
    );
  }

  const certificate =
    getCertificateById(
      certificateId
    );

  if (!certificate) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold text-[#063D2E]">
          Certificat introuvable
        </h1>

        <Link
          href="/dashboard/certificates"
          className="mt-6 inline-block font-bold text-[#0B5D3B]"
        >
          Retour aux certificats
        </Link>
      </div>
    );
  }

  const verificationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${certificate.verificationPath}`
      : certificate.verificationPath;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-8">
      <Link
        href="/dashboard/certificates"
        className="inline-flex items-center gap-2 font-bold text-[#0B5D3B]"
      >
        <ArrowLeft size={18} />
        Retour aux certificats
      </Link>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-wider text-[#F58220]">
            Certificat officiel
          </p>

          <h1 className="mt-2 text-4xl font-extrabold text-[#063D2E]">
            {
              certificate.courseCode
            }
          </h1>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 font-bold text-green-700">
          <ShieldCheck
            size={18}
          />
          Certificat valide
        </span>
      </div>

      <div className="mt-8">
        <DynamicCertificate
          data={{
            recipientName:
              certificate.recipientName,

            courseName:
              certificate.courseTitle,

            courseSubtitle:
              certificate.courseTitleFr,

            certificateId:
              certificate.certificateNumber,

            completionDate:
              new Date(
                certificate.issueDate
              ).toLocaleDateString(
                "fr-FR",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }
              ),

            directorName:
              certificate.academicDirector,

            verificationUrl,
          }}
        />
      </div>
    </div>
  );
}