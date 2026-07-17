"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Library,
} from "lucide-react";

import {
  resourceCatalog,
} from "@/data/resource-catalog";

import { useResources } from "@/hooks/use-resources";
import { useLanguage } from "@/hooks/use-language";

import type {
  ResourceFiltersValue,
} from "@/types/resource";

import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceFilters } from "@/components/resources/ResourceFilters";

const initialFilters: ResourceFiltersValue = {
  search: "",
  type: "all",
  language: "all",
  courseSlug: "all",
  favoritesOnly: false,
};

function normalize(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

export function ResourceLibrary() {
  const { text } = useLanguage();
  const {
    isFavorite,
    isLoading,
  } = useResources();

  const [filters, setFilters] =
    useState<ResourceFiltersValue>(
      initialFilters
    );

  const courses = useMemo(() => {
    const map = new Map<
      string,
      string
    >();

    resourceCatalog.forEach(
      (resource) => {
        map.set(
          resource.courseSlug,
          resource.courseTitle
        );
      }
    );

    return Array.from(
      map.entries()
    ).map(([slug, title]) => ({
      slug,
      title,
    }));
  }, []);

  const filteredResources =
    useMemo(() => {
      const search =
        normalize(filters.search);

      return resourceCatalog.filter(
        (resource) => {
          const matchesSearch =
            !search ||
            normalize(
              [
                resource.title,
                resource.description,
                resource.courseTitle,
                resource.moduleTitle ??
                  "",
                ...resource.tags,
              ].join(" ")
            ).includes(search);

          const matchesType =
            filters.type ===
              "all" ||
            resource.type ===
              filters.type;

          const matchesLanguage =
            filters.language ===
              "all" ||
            resource.language ===
              filters.language;

          const matchesCourse =
            filters.courseSlug ===
              "all" ||
            resource.courseSlug ===
              filters.courseSlug;

          const matchesFavorite =
            !filters.favoritesOnly ||
            isFavorite(resource.id);

          return (
            matchesSearch &&
            matchesType &&
            matchesLanguage &&
            matchesCourse &&
            matchesFavorite
          );
        }
      );
    }, [filters, isFavorite]);

  if (isLoading) {
    return (
      <div className="rounded-[24px] bg-white p-8">
        {text("Chargement de la bibliothèque...", "Loading library...")}
      </div>
    );
  }

  return (
    <div>
      <ResourceFilters
        value={filters}
        courses={courses}
        onChange={setFilters}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="font-bold text-[#063D2E]">
          {
            filteredResources.length
          }{" "}
          {text("ressource", "resource")}
          {filteredResources.length >
          1
            ? "s"
            : ""}
        </p>

        <button
          type="button"
          onClick={() =>
            setFilters(
              initialFilters
            )
          }
          className="text-sm font-bold text-[#0B5D3B] hover:underline"
        >
          {text("Réinitialiser les filtres", "Reset filters")}
        </button>
      </div>

      {filteredResources.length ===
      0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-green-200 bg-white p-12 text-center">
          <Library
            size={44}
            className="mx-auto text-[#0B5D3B]"
          />

          <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
            {text("Aucune ressource trouvée", "No resources found")}
          </h2>

          <p className="mt-2 text-slate-500">
            {text("Modifiez vos critères de recherche ou réinitialisez les filtres.", "Change your search criteria or reset the filters.")}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid min-w-0 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {filteredResources.map(
            (resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
