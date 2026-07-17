"use client";

import { BookOpenCheck, Download, Library } from "lucide-react";

import { resourceCatalog } from "@/data/resource-catalog";

import { RecommendedResources } from "@/components/resources/RecommendedResources";
import { ResourceLibrary } from "@/components/resources/ResourceLibrary";
import { useLanguage } from "@/hooks/use-language";

export default function ResourcesPage() {
  const { text } = useLanguage();
  const courseCount = new Set(
    resourceCatalog.map((resource) => resource.courseSlug),
  ).size;

  const featuredCount = resourceCatalog.filter(
    (resource) => resource.featured,
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Ressources pédagogiques", "Learning resources")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("Bibliothèque NutVitaGlobalis", "NutVitaGlobalis Library")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Consultez les guides, protocoles, fiches techniques, présentations et vidéos complémentaires à vos formations.",
            "Browse guides, protocols, technical sheets, presentations and videos supporting your courses.",
          )}
        </p>
      </header>

      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        <article className="rounded-[24px] border border-green-100 bg-white p-6">
          <Library className="text-[#0B5D3B]" />

          <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">
            {resourceCatalog.length}
          </p>

          <p className="text-sm text-slate-500">
            {text("Ressources disponibles", "Available resources")}
          </p>
        </article>

        <article className="rounded-[24px] border border-green-100 bg-white p-6">
          <BookOpenCheck className="text-[#0B5D3B]" />

          <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">
            {courseCount}
          </p>

          <p className="text-sm text-slate-500">
            {text("Formations couvertes", "Courses covered")}
          </p>
        </article>

        <article className="rounded-[24px] border border-green-100 bg-white p-6">
          <Download className="text-[#F58220]" />

          <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">
            {featuredCount}
          </p>

          <p className="text-sm text-slate-500">
            {text("Ressources recommandées", "Recommended resources")}
          </p>
        </article>
      </section>

      <div className="mt-12">
        <RecommendedResources limit={3} />
      </div>

      <section className="mt-14">
        <h2 className="text-3xl font-extrabold text-[#063D2E]">
          {text("Toutes les ressources", "All resources")}
        </h2>

        <p className="mt-2 text-slate-600">
          {text(
            "Utilisez les filtres pour retrouver rapidement un document.",
            "Use the filters to quickly find a document.",
          )}
        </p>

        <div className="mt-6">
          <ResourceLibrary />
        </div>
      </section>
    </div>
  );
}
