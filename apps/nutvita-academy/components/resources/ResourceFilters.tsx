"use client";

import {
  Search,
} from "lucide-react";

import type {
  ResourceFiltersValue,
  ResourceLanguage,
  ResourceType,
} from "@/types/resource";
import { useLanguage } from "@/hooks/use-language";

type ResourceFiltersProps = {
  value: ResourceFiltersValue;

  courses: Array<{
    slug: string;
    title: string;
  }>;

  onChange: (
    value: ResourceFiltersValue
  ) => void;
};

const resourceTypes: Array<{
  value: ResourceType | "all";
  label: { fr: string; en: string };
}> = [
  {
    value: "all",
    label: { fr: "Tous les types", en: "All types" },
  },
  {
    value: "pdf",
    label: { fr: "PDF", en: "PDF" },
  },
  {
    value: "guide",
    label: { fr: "Guides", en: "Guides" },
  },
  {
    value: "presentation",
    label: { fr: "Présentations", en: "Presentations" },
  },
  {
    value: "checklist",
    label: { fr: "Listes de contrôle", en: "Checklists" },
  },
  {
    value: "protocol",
    label: { fr: "Protocoles", en: "Protocols" },
  },
  {
    value: "video",
    label: { fr: "Vidéos", en: "Videos" },
  },
  {
    value: "link",
    label: { fr: "Liens", en: "Links" },
  },
];

const languages: Array<{
  value: ResourceLanguage | "all";
  label: { fr: string; en: string };
}> = [
  {
    value: "all",
    label: { fr: "Toutes les langues", en: "All languages" },
  },
  {
    value: "fr",
    label: { fr: "Français", en: "French" },
  },
  {
    value: "en",
    label: { fr: "Anglais", en: "English" },
  },
  {
    value: "bilingual",
    label: { fr: "Bilingue", en: "Bilingual" },
  },
];

export function ResourceFilters({
  value,
  courses,
  onChange,
}: ResourceFiltersProps) {
  const { locale, text } = useLanguage();
  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_190px_220px]">
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={value.search}
            onChange={(event) =>
              onChange({
                ...value,
                search:
                  event.target.value,
              })
            }
            placeholder={text("Rechercher une ressource...", "Search resources...")}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-11 pr-4 text-sm outline-none focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
          />
        </label>

        <select
          value={value.type}
          onChange={(event) =>
            onChange({
              ...value,

              type:
                event.target
                  .value as ResourceFiltersValue["type"],
            })
          }
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0B5D3B]"
        >
          {resourceTypes.map(
            (type) => (
              <option
                key={type.value}
                value={type.value}
              >
                {type.label[locale]}
              </option>
            )
          )}
        </select>

        <select
          value={value.language}
          onChange={(event) =>
            onChange({
              ...value,

              language:
                event.target
                  .value as ResourceFiltersValue["language"],
            })
          }
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0B5D3B]"
        >
          {languages.map(
            (language) => (
              <option
                key={language.value}
                value={
                  language.value
                }
              >
                {language.label[locale]}
              </option>
            )
          )}
        </select>

        <select
          value={value.courseSlug}
          onChange={(event) =>
            onChange({
              ...value,

              courseSlug:
                event.target.value,
            })
          }
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0B5D3B]"
        >
          <option value="all">
            {text("Toutes les formations", "All courses")}
          </option>

          {courses.map(
            (course) => (
              <option
                key={course.slug}
                value={course.slug}
              >
                {course.title}
              </option>
            )
          )}
        </select>
      </div>

      <label className="mt-4 inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={
            value.favoritesOnly
          }
          onChange={(event) =>
            onChange({
              ...value,

              favoritesOnly:
                event.target.checked,
            })
          }
          className="h-4 w-4 accent-[#0B5D3B]"
        />

        {text("Afficher uniquement mes favoris", "Show only my favorites")}
      </label>
    </section>
  );
}
