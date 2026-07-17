"use client";

import {
  Bookmark,
  Trash2,
} from "lucide-react";

import type {
  VideoBookmark,
} from "@/types/video";

import { formatVideoTime } from "@/lib/video-storage";
import { useLanguage } from "@/hooks/use-language";

type VideoBookmarksProps = {
  bookmarks: VideoBookmark[];
  onSeek: (seconds: number) => void;
  onDelete: (bookmarkId: string) => void;
};

export function VideoBookmarks({
  bookmarks,
  onSeek,
  onDelete,
}: VideoBookmarksProps) {
  const { text } = useLanguage();
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-2xl bg-[#F8FAFC] p-5 text-center">
        <Bookmark
          size={26}
          className="mx-auto text-[#0B5D3B]"
        />

        <p className="mt-3 text-sm text-slate-500">
          {text("Aucun signet enregistré.", "No bookmarks saved.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] p-4"
        >
          <button
            type="button"
            onClick={() =>
              onSeek(bookmark.timeSeconds)
            }
            className="min-w-0 text-left"
          >
            <p className="font-extrabold text-[#063D2E]">
              {formatVideoTime(
                bookmark.timeSeconds
              )}
            </p>

            <p className="mt-1 truncate text-sm text-slate-500">
              {bookmark.label}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(bookmark.id)
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
            aria-label={text("Supprimer le signet", "Delete bookmark")}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}
