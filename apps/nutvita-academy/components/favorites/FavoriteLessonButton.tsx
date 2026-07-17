"use client";

import {
  Heart,
} from "lucide-react";

import type {
  LessonReference,
} from "@/types/learning-tools";

import { useLearningTools } from "@/hooks/use-learning-tools";

type FavoriteLessonButtonProps = {
  reference: LessonReference;
};

export function FavoriteLessonButton({
  reference,
}: FavoriteLessonButtonProps) {
  const {
    toggleFavorite,
    isFavorite,
  } = useLearningTools();

  const favorite = isFavorite(
    reference.courseSlug,
    reference.moduleSlug,
    reference.lessonSlug
  );

  return (
    <button
      type="button"
      onClick={() =>
        toggleFavorite(reference)
      }
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition ${
        favorite
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-[#0B5D3B] bg-white text-[#0B5D3B] hover:bg-[#DDF5E8]"
      }`}
    >
      <Heart
        size={18}
        fill={
          favorite
            ? "currentColor"
            : "none"
        }
      />

      {favorite
        ? "Retirer des favoris"
        : "Ajouter aux favoris"}
    </button>
  );
}