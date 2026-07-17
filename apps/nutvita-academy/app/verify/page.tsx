"use client";

import {
  FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  Search,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export default function VerifyPage() {
  const { text } = useLanguage();
  const router =
    useRouter();

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget
      );

    const certificateId =
      String(
        formData.get(
          "certificateId"
        ) ?? ""
      ).trim();

    if (!certificateId) {
      return;
    }

    router.push(
      `/verify/${encodeURIComponent(
        certificateId
      )}`
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-12">
      <div className="w-full max-w-xl rounded-[28px] border border-green-100 bg-white p-8">
        <ShieldCheck
          size={50}
          className="mx-auto text-[#0B5D3B]"
        />

        <h1 className="mt-5 text-center text-3xl font-extrabold text-[#063D2E]">
          {text("Vérifier un certificat", "Verify a certificate")}
        </h1>

        <p className="mt-3 text-center text-slate-600">
          {text(
            "Entrez l’identifiant figurant sur le certificat.",
            "Enter the identifier shown on the certificate.",
          )}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-7"
        >
          <input
            type="text"
            name="certificateId"
            placeholder="CAMMS-2026-XXXXXX"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
          />

          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
          >
            <Search size={19} />
            {text("Vérifier", "Verify")}
          </button>
        </form>
      </div>
    </main>
  );
}
