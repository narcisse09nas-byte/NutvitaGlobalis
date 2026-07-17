"use client";

import {
  Award,
  CheckCircle2,
  CircleX,
  ShieldCheck,
} from "lucide-react";

import {
  findCertificateById,
} from "@/lib/certificate-storage";
import { useLanguage } from "@/hooks/use-language";

export function CertificateVerification({
  certificateId,
}: {
  certificateId: string;
}) {
  const { locale, text } = useLanguage();
  const certificate =
    findCertificateById(
      certificateId
    );

  if (!certificate) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center">
        <CircleX
          size={52}
          className="mx-auto text-red-600"
        />

        <h1 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
          {text("Certificat introuvable", "Certificate not found")}
        </h1>

        <p className="mt-3 text-slate-600">
          {text(
            "Aucun certificat correspondant à cet identifiant n’a été trouvé sur cet appareil.",
            "No certificate matching this identifier was found on this device.",
          )}
        </p>
      </div>
    );
  }

  const valid =
    certificate.status ===
    "valid";

  return (
    <div className="rounded-[28px] border border-green-200 bg-white p-8">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
          {valid ? (
            <CheckCircle2
              size={42}
            />
          ) : (
            <CircleX
              size={42}
            />
          )}
        </div>

        <h1 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
          {valid
            ? text("Certificat valide", "Valid certificate")
            : text("Certificat non valide", "Invalid certificate")}
        </h1>

        <p className="mt-3 text-slate-600">
          {text("Vérification NutVitaGlobalis Academy.", "NutVitaGlobalis Academy verification.")}
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs text-slate-500">
            {text("Bénéficiaire", "Recipient")}
          </p>

          <p className="mt-1 font-extrabold text-[#063D2E]">
            {
              certificate.recipientName
            }
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs text-slate-500">
            {text("Numéro", "Number")}
          </p>

          <p className="mt-1 font-extrabold text-[#063D2E]">
            {
              certificate.certificateNumber
            }
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5 md:col-span-2">
          <p className="text-xs text-slate-500">
            Certification
          </p>

          <p className="mt-1 font-extrabold text-[#063D2E]">
            {
              certificate.courseTitle
            }
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs text-slate-500">
            {text("Date de délivrance", "Issue date")}
          </p>

          <p className="mt-1 font-extrabold text-[#063D2E]">
            {new Date(
              certificate.issueDate
            ).toLocaleDateString(
              locale === "fr" ? "fr-FR" : "en-US"
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs text-slate-500">
            Score final
          </p>

          <p className="mt-1 font-extrabold text-[#063D2E]">
            {
              certificate.finalScore
            }
            %
          </p>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-center gap-3 rounded-2xl bg-[#063D2E] p-5 text-white">
        <Award size={24} />
        <ShieldCheck size={24} />

        <span className="font-bold">
          NutVitaGlobalis Academy
        </span>
      </div>
    </div>
  );
}
