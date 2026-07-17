"use client";

import Link from "next/link";

import { Heart } from "lucide-react";

import { useLearningTools } from "@/hooks/use-learning-tools";
import { useLanguage } from "@/hooks/use-language";

export default function FavoritesPage() {
  const { text } = useLanguage();
  const { favorites, toggleFavorite, isLoading } = useLearningTools();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        {text("Apprentissage", "Learning")}
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Mes favoris", "My favorites")}
      </h1>

      <p className="mt-3 max-w-3xl text-slate-600">
        {text(
          "Retrouvez rapidement les leçons que vous avez enregistrées.",
          "Quickly find the lessons you saved.",
        )}
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-[24px] bg-white p-8">
            {text("Chargement…", "Loading…")}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center md:col-span-2 xl:col-span-3">
            <Heart size={42} className="mx-auto text-[#0B5D3B]" />

            <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
              {text("Aucun favori", "No favorites")}
            </h2>
          </div>
        ) : (
          favorites.map((favorite) => (
            <article
              key={favorite.id}
              className="flex h-full flex-col justify-between rounded-[24px] border border-green-100 bg-white p-6"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#F58220]">
                  {favorite.courseTitle}
                </p>

                <h2 className="mt-3 text-xl font-extrabold text-[#063D2E]">
                  {favorite.lessonTitle}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {favorite.moduleTitle}
                </p>
              </div>

              <div className="mt-7 flex gap-3">
                <Link
                  href={`/dashboard/courses/${favorite.courseSlug}/${favorite.moduleSlug}?lesson=${favorite.lessonSlug}`}
                  className="flex-1 rounded-full bg-[#F58220] px-4 py-2.5 text-center text-sm font-bold text-white"
                >
                  {text("Ouvrir", "Open")}
                </Link>

                <button
                  type="button"
                  onClick={() => toggleFavorite(favorite)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500"
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
