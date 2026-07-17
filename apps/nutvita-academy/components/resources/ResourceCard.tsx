"use client";

import {
  CheckSquare,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Link2,
  MonitorPlay,
  Presentation,
  ScrollText,
  Video,
} from "lucide-react";

import type {
  AcademyResource,
  ResourceType,
} from "@/types/resource";

import { useResources } from "@/hooks/use-resources";
import { useLanguage } from "@/hooks/use-language";

const typeLabels: Record<ResourceType, { fr: string; en: string }> = {
  pdf: { fr: "PDF", en: "PDF" },
  guide: { fr: "Guide", en: "Guide" },
  presentation: { fr: "Présentation", en: "Presentation" },
  checklist: { fr: "Liste de contrôle", en: "Checklist" },
  protocol: { fr: "Protocole", en: "Protocol" },
  link: { fr: "Lien", en: "Link" },
  video: { fr: "Vidéo", en: "Video" },
};

const typeIcons: Record<
  ResourceType,
  typeof FileText
> = {
  pdf: FileText,
  guide: ScrollText,
  presentation: Presentation,
  checklist: CheckSquare,
  protocol: MonitorPlay,
  link: Link2,
  video: Video,
};

const languageLabels = {
  fr: { fr: "Français", en: "French" },
  en: { fr: "Anglais", en: "English" },
  bilingual: { fr: "FR / EN", en: "FR / EN" },
};

export function ResourceCard({
  resource,
}: {
  resource: AcademyResource;
}) {
  const { locale, text } = useLanguage();
  const {
    isFavorite,
    toggleFavorite,
    registerDownload,
    getDownloadCount,
  } = useResources();

  const favorite =
    isFavorite(resource.id);

  const Icon =
    typeIcons[resource.type];

  const downloadCount =
    getDownloadCount(
      resource.id
    );

  function handleOpen() {
    registerDownload(
      resource.id
    );
  }

  return (
    <article className="flex h-full min-w-0 flex-col justify-between rounded-[26px] border border-green-100 bg-white p-6 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DDF5E8] text-[#0B5D3B]">
            <Icon size={24} />
          </div>

          <button
            type="button"
            onClick={() =>
              toggleFavorite(
                resource.id
              )
            }
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
              favorite
                ? "bg-red-50 text-red-500"
                : "bg-[#F8FAFC] text-slate-400 hover:text-red-500"
            }`}
            aria-label={
              favorite
                ? text("Retirer des favoris", "Remove from favorites")
                : text("Ajouter aux favoris", "Add to favorites")
            }
          >
            <Heart
              size={19}
              fill={
                favorite
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
            {
              typeLabels[resource.type][locale]
            }
          </span>

          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
            {
              languageLabels[resource.language][locale]
            }
          </span>

          {resource.featured && (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              {text("Recommandé", "Recommended")}
            </span>
          )}
        </div>

        <h2 className="mt-5 text-xl font-extrabold leading-7 text-[#063D2E]">
          {resource.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {resource.description}
        </p>

        <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#F58220]">
            {resource.courseTitle}
          </p>

          {resource.moduleTitle && (
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {resource.moduleTitle}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {resource.tags
            .slice(0, 4)
            .map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {resource.fileSize ??
              (resource.durationMinutes
                ? `${resource.durationMinutes} min`
                : text("Ressource externe", "External resource"))}
          </span>

          <span>
            {downloadCount} ouverture
            {downloadCount > 1
              ? "s"
              : ""}
          </span>
        </div>

        <a
          href={resource.href}
          target="_blank"
          rel="noreferrer"
          onClick={handleOpen}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F58220] px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
        >
          {resource.type ===
          "link" ? (
            <ExternalLink
              size={18}
            />
          ) : (
            <Download size={18} />
          )}

          {text("Ouvrir la ressource", "Open resource")}
        </a>
      </div>
    </article>
  );
}
