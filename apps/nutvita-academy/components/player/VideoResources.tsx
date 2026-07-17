"use client";

import {
  ExternalLink,
  FileText,
} from "lucide-react";

import type {
  VideoResource,
} from "@/types/video";
import { useLanguage } from "@/hooks/use-language";

type VideoResourcesProps = {
  resources: VideoResource[];
};

export function VideoResources({
  resources,
}: VideoResourcesProps) {
  const { text } = useLanguage();
  if (resources.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {text("Aucune ressource complémentaire.", "No additional resources.")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => (
        <a
          key={resource.id}
          href={resource.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-start justify-between gap-4 rounded-2xl border border-green-100 bg-white p-4 transition hover:bg-green-50"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF5E8] text-[#0B5D3B]">
              <FileText size={20} />
            </span>

            <span>
              <span className="block font-extrabold text-[#063D2E]">
                {resource.title}
              </span>

              {resource.description && (
                <span className="mt-1 block text-sm text-slate-500">
                  {resource.description}
                </span>
              )}
            </span>
          </div>

          <ExternalLink
            size={18}
            className="shrink-0 text-[#0B5D3B]"
          />
        </a>
      ))}
    </div>
  );
}
