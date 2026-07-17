"use client";

import Link from "next/link";

import { ArrowRight, Lightbulb } from "lucide-react";

import type { DashboardRecommendation } from "@/types/student-dashboard";
import { useLanguage } from "@/hooks/use-language";

const priorityStyles = {
  high: "border-red-100 bg-red-50",
  normal: "border-green-100 bg-white",
  low: "border-slate-100 bg-[#F8FAFC]",
};

export function DashboardRecommendations({
  recommendations,
}: {
  recommendations: DashboardRecommendation[];
}) {
  const { text } = useLanguage();
  return (
    <section>
      <div className="flex items-center gap-3">
        <Lightbulb className="text-[#F58220]" />

        <div>
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Recommandations", "Recommendations")}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {text(
              "Vos prochaines actions prioritaires.",
              "Your next priority actions.",
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {recommendations.map((recommendation) => (
          <article
            key={recommendation.id}
            className={`rounded-[24px] border p-6 ${
              priorityStyles[recommendation.priority]
            }`}
          >
            <h3 className="text-lg font-extrabold text-[#063D2E]">
              {recommendation.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {recommendation.description}
            </p>

            <Link
              href={recommendation.href}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0B5D3B]"
            >
              {recommendation.actionLabel}

              <ArrowRight size={17} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
