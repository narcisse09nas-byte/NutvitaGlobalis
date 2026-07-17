"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import type { ProctoringReadiness } from "@/types/identity-engine";
import { useLanguage } from "@/hooks/use-language";

export function ProctoringAiReadiness() {
  const { text } = useLanguage();
  const [readiness, setReadiness] = useState<ProctoringReadiness | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/proctoring/readiness", { cache: "no-store" })
      .then((response) => response.json() as Promise<ProctoringReadiness>)
      .then((payload) => {
        if (active) setReadiness(payload);
      })
      .catch(() => {
        if (active) setReadiness(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!readiness) return null;

  return (
    <section
      className={`rounded-[28px] border p-6 ${readiness.canAutoVerifyIdentity ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-3xl gap-3">
          <Bot className="mt-1 shrink-0 text-[#0B5D3B]" />
          <div>
            <h2 className="text-xl font-extrabold text-[#063D2E]">
              {text("Moteur IA d’identité et de surveillance", "AI identity and proctoring engine")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {readiness.summary}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-4 py-2 text-xs font-extrabold ${readiness.canAutoVerifyIdentity ? "bg-green-700 text-white" : "bg-amber-200 text-amber-950"}`}
        >
          {readiness.canAutoVerifyIdentity
            ? text("Automatisation prête", "Automation ready")
            : text("Configuration requise", "Configuration required")}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {readiness.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-2xl border border-white/80 bg-white/80 p-4"
          >
            <div className="flex items-start gap-3">
              {check.ready ? (
                <CheckCircle2 className="shrink-0 text-green-700" size={20} />
              ) : (
                <ShieldAlert className="shrink-0 text-amber-700" size={20} />
              )}
              <div>
                <p className="font-bold text-[#063D2E]">{check.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {check.ready ? text("Configuré", "Configured") : check.action}
                </p>
                {!check.ready && check.provider && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                    <ExternalLink size={13} />
                    {text("Fournisseur", "Provider")}: {check.provider}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
