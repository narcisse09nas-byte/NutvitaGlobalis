"use client";

import {
  Award,
  CheckCircle2,
} from "lucide-react";

import type {
  AcademyCourse,
} from "@/types/course";

import type {
  CertificationEligibilityResult,
} from "@/types/certification";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useCertificates } from "@/hooks/use-certificates";
import { useProctoring } from "@/hooks/use-proctoring";
import { useLanguage } from "@/hooks/use-language";

import {
  createCertificateRecord,
} from "@/lib/certificate-engine";

type IssueCertificateButtonProps = {
  course: AcademyCourse;
  eligibility: CertificationEligibilityResult;
};

export function IssueCertificateButton({
  course,
  eligibility,
}: IssueCertificateButtonProps) {
  const { text } = useLanguage();
  const { user } =
    useLocalAuth();

  const {
    certificates,
    issueCertificate,
  } = useCertificates();
  const { data: proctoring } = useProctoring();

  if (!user) {
    return null;
  }

  const existingCertificate =
    certificates.find(
      (certificate) =>
        certificate.courseSlug ===
        course.slug
    );
  const approvedBooking = proctoring.bookings.find((booking) =>
    booking.userId === user.id &&
    booking.courseSlug === course.slug &&
    booking.status === "approved" &&
    booking.identity?.status === "verified" &&
    booking.integrityStatus === "approved" &&
    booking.attemptPassed === true &&
    (booking.conductRating === "good" || booking.conductRating === "passable")
  );
  const integrityApproved = Boolean(approvedBooking);

  if (existingCertificate) {
    return (
      <a
        href={`/dashboard/certificates/${existingCertificate.id}`}
        className="inline-flex items-center gap-2 rounded-full bg-green-100 px-6 py-3 font-bold text-green-700"
      >
        <CheckCircle2 size={19} />
        {text("Voir mon certificat", "View my certificate")}
      </a>
    );
  }

  if (eligibility.eligible && !integrityApproved) {
    return <button type="button" disabled className="inline-flex items-center gap-2 rounded-full bg-slate-300 px-6 py-3 font-bold text-white"><Award size={20} />{text("Validation dâ€™intÃ©gritÃ© requise", "Integrity approval required")}</button>;
  }

  function handleIssue() {
    if (
      !eligibility.eligible ||
      !integrityApproved ||
      !user
    ) {
      return;
    }

    const certificate =
      createCertificateRecord({
        user,
        course,

        finalScore:
          eligibility.finalScore ??
          approvedBooking?.attemptScorePercent ??
          eligibility.examScore ??
          0,
      });

    const saved =
      issueCertificate(
        certificate
      );

    window.location.href =
      `/dashboard/certificates/${saved.id}`;
  }

  return (
    <button
      type="button"
      onClick={handleIssue}
      disabled={
        !eligibility.eligible ||
        !integrityApproved
      }
      className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      <Award size={20} />
      {text("GÃ©nÃ©rer mon certificat", "Generate my certificate")}
    </button>
  );
}