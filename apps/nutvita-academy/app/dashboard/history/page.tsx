"use client";

import Link from "next/link";

import { Clock3, History } from "lucide-react";

import { useLearningTools } from "@/hooks/use-learning-tools";
import { formatVideoTime } from "@/lib/video-storage";
import { useLanguage } from "@/hooks/use-language";

export default function HistoryPage() {
  const { locale, text } = useLanguage();
  const { history, isLoading } = useLearningTools();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        {text("Activité", "Activity")}
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Historique d’apprentissage", "Learning history")}
      </h1>

      <p className="mt-3 max-w-3xl text-slate-600">
        {text(
          "Consultez les dernières leçons ouvertes sur votre compte.",
          "Review the latest lessons opened on your account.",
        )}
      </p>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="rounded-[24px] bg-white p-8">
            {text("Chargement…", "Loading…")}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
            <History size={42} className="mx-auto text-[#0B5D3B]" />

            <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
              {text("Aucun historique", "No learning history")}
            </h2>
          </div>
        ) : (
          history.map((entry) => (
            <Link
              key={entry.id}
              href={`/dashboard/courses/${entry.courseSlug}/${entry.moduleSlug}?lesson=${entry.lessonSlug}`}
              className="block rounded-[24px] border border-green-100 bg-white p-6 transition hover:bg-green-50"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#F58220]">
                    {entry.courseTitle}
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-[#063D2E]">
                    {entry.lessonTitle}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {entry.moduleTitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    {new Date(entry.visitedAt).toLocaleString(
                      locale === "fr" ? "fr-FR" : "en-US",
                    )}
                  </span>

                  {entry.videoTimeSeconds !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} />

                      {formatVideoTime(entry.videoTimeSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
