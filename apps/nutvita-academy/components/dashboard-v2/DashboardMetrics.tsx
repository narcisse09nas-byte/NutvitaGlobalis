"use client";

import Link from "next/link";

import { Award, BookOpenCheck, Clock3, ClipboardCheck } from "lucide-react";

import type { DashboardMetric } from "@/types/student-dashboard";
import { useLanguage } from "@/hooks/use-language";

const metricIcons = {
  "learning-time": Clock3,
  "completed-lessons": BookOpenCheck,
  quizzes: ClipboardCheck,
  certificates: Award,
};

export function DashboardMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  const { locale } = useLanguage();
  const englishCopy: Record<string, { label: string; description: string }> = {
    "learning-time": {
      label: "Learning time",
      description: "Total tracked learning time.",
    },
    "completed-lessons": {
      label: "Completed lessons",
      description: "Lessons completed across your courses.",
    },
    quizzes: {
      label: "Quizzes",
      description: "Completed quizzes and recorded results.",
    },
    certificates: {
      label: "Certificates",
      description: "Professional certificates issued.",
    },
  };
  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon =
          metricIcons[metric.id as keyof typeof metricIcons] ?? BookOpenCheck;

        const content = (
          <article className="h-full rounded-[24px] border border-green-100 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF5E8] text-[#0B5D3B]">
              <Icon size={22} />
            </div>

            <p className="mt-5 text-3xl font-extrabold text-[#063D2E]">
              {metric.value}
            </p>

            <p className="mt-1 font-bold text-slate-700">
              {locale === "en"
                ? (englishCopy[metric.id]?.label ?? metric.label)
                : metric.label}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {locale === "en"
                ? (englishCopy[metric.id]?.description ?? metric.description)
                : metric.description}
            </p>
          </article>
        );

        return metric.href ? (
          <Link key={metric.id} href={metric.href}>
            {content}
          </Link>
        ) : (
          <div key={metric.id}>{content}</div>
        );
      })}
    </section>
  );
}
