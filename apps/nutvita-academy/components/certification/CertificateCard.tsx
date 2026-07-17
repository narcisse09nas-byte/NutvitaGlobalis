import Link from "next/link";

import {
  Award,
  CalendarDays,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import type {
  CertificateRecord,
} from "@/types/certification";
import { useLanguage } from "@/hooks/use-language";

export function CertificateCard({
  certificate,
}: {
  certificate: CertificateRecord;
}) {
  const { locale, text } = useLanguage();
  return (
    <article className="flex h-full flex-col justify-between rounded-[28px] border border-green-100 bg-white p-6 shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
            <Award size={25} />
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            <ShieldCheck
              size={14}
            />
            {text("Valide", "Valid")}
          </span>
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#F58220]">
          {
            certificate.courseCode
          }
        </p>

        <h2 className="mt-2 text-xl font-extrabold text-[#063D2E]">
          {
            certificate.courseTitle
          }
        </h2>

        <p className="mt-3 text-sm text-slate-500">
          {
            certificate.courseTitleFr
          }
        </p>

        <div className="mt-6 rounded-2xl bg-[#F8FAFC] p-4">
          <p className="text-xs text-slate-500">
            {text("Numéro du certificat", "Certificate number")}
          </p>

          <p className="mt-1 font-extrabold text-[#063D2E]">
            {
              certificate.certificateNumber
            }
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays
            size={17}
          />

          {text("Délivré le", "Issued on")}{" "}
          {new Date(
            certificate.issueDate
          ).toLocaleDateString(
            locale === "fr" ? "fr-FR" : "en-US"
          )}
        </div>
      </div>

      <div className="mt-7 flex gap-3">
        <Link
          href={`/dashboard/certificates/${certificate.id}`}
          className="flex-1 rounded-full bg-[#F58220] px-4 py-3 text-center text-sm font-bold text-white"
        >
          {text("Ouvrir", "Open")}
        </Link>

        <Link
          href={certificate.verificationPath}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0B5D3B] text-[#0B5D3B]"
          aria-label={text("Vérifier le certificat", "Verify certificate")}
        >
          <ExternalLink
            size={18}
          />
        </Link>
      </div>
    </article>
  );
}
