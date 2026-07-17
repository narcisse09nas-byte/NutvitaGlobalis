"use client";

import {
  Sparkles,
} from "lucide-react";

import {
  resourceCatalog,
} from "@/data/resource-catalog";

import { ResourceCard } from "@/components/resources/ResourceCard";
import { useLanguage } from "@/hooks/use-language";

export function RecommendedResources({
  courseSlug,
  limit = 3,
}: {
  courseSlug?: string;
  limit?: number;
}) {
  const { text } = useLanguage();
  const resources =
    resourceCatalog
      .filter(
        (resource) =>
          resource.featured &&
          (!courseSlug ||
            resource.courseSlug ===
              courseSlug)
      )
      .slice(0, limit);

  if (resources.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-3">
        <Sparkles className="text-[#F58220]" />

        <div>
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Ressources recommandées", "Recommended resources")}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {text("Documents utiles pour poursuivre votre apprentissage.", "Useful documents to continue your learning.")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {resources.map(
          (resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
            />
          )
        )}
      </div>
    </section>
  );
}
