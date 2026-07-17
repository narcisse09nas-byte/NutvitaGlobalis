"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  Clock3,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import type {
  LessonReference,
} from "@/types/learning-tools";

import { useLearningTools } from "@/hooks/use-learning-tools";
import { useLanguage } from "@/hooks/use-language";
import { formatVideoTime } from "@/lib/video-storage";

type LessonNotesPanelProps = {
  reference: LessonReference;
  currentVideoTime?: number;
  onSeek?: (seconds: number) => void;
};

export function LessonNotesPanel({
  reference,
  currentVideoTime,
  onSeek,
}: LessonNotesPanelProps) {
  const { locale, text } = useLanguage();
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
  } = useLearningTools();

  const [content, setContent] =
    useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editingContent, setEditingContent] =
    useState("");

  const lessonNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          note.courseSlug ===
            reference.courseSlug &&
          note.moduleSlug ===
            reference.moduleSlug &&
          note.lessonSlug ===
            reference.lessonSlug
      ),
    [
      notes,
      reference.courseSlug,
      reference.moduleSlug,
      reference.lessonSlug,
    ]
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!content.trim()) {
      return;
    }

    addNote(
      reference,
      content,
      currentVideoTime
    );

    setContent("");
  }

  function startEditing(
    noteId: string,
    noteContent: string
  ) {
    setEditingId(noteId);
    setEditingContent(noteContent);
  }

  function saveEditing() {
    if (
      !editingId ||
      !editingContent.trim()
    ) {
      return;
    }

    updateNote(
      editingId,
      editingContent
    );

    setEditingId(null);
    setEditingContent("");
  }

  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#063D2E]">
            {text("Mes notes", "My notes")}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {text("Enregistrez vos observations pendant la leçon.", "Save your observations during the lesson.")}
          </p>
        </div>

        <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
          {lessonNotes.length} note
          {lessonNotes.length > 1
            ? "s"
            : ""}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5"
      >
        <textarea
          value={content}
          onChange={(event) =>
            setContent(
              event.target.value
            )
          }
          rows={4}
          placeholder={text("Écrivez une note sur cette leçon...", "Write a note about this lesson...")}
          className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {currentVideoTime !== undefined && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock3 size={15} />

              {text("Position vidéo", "Video position")}:
              {formatVideoTime(
                currentVideoTime
              )}
            </span>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            <Plus size={17} />
            {text("Ajouter la note", "Add note")}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {lessonNotes.length === 0 ? (
          <div className="rounded-2xl bg-[#F8FAFC] p-5 text-center text-sm text-slate-500">
            {text("Aucune note pour cette leçon.", "No notes for this lesson.")}
          </div>
        ) : (
          lessonNotes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl bg-[#F8FAFC] p-4"
            >
              {editingId === note.id ? (
                <>
                  <textarea
                    value={
                      editingContent
                    }
                    onChange={(event) =>
                      setEditingContent(
                        event.target.value
                      )
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B5D3B]"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={
                        saveEditing
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-4 py-2 text-xs font-bold text-white"
                    >
                      <Save size={15} />
                      {text("Enregistrer", "Save")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {note.content}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {note.videoTimeSeconds !==
                        undefined && (
                        <button
                          type="button"
                          onClick={() =>
                            onSeek?.(
                              note.videoTimeSeconds ??
                                0
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B5D3B]"
                        >
                          <Clock3
                            size={14}
                          />

                          {formatVideoTime(
                            note.videoTimeSeconds
                          )}
                        </button>
                      )}

                      <span className="text-xs text-slate-400">
                        {new Date(
                          note.updatedAt
                        ).toLocaleDateString(
                          locale === "fr" ? "fr-FR" : "en-US"
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(
                            note.id,
                            note.content
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[#0B5D3B] hover:bg-green-100"
                        aria-label={text("Modifier la note", "Edit note")}
                      >
                        <Pencil
                          size={15}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteNote(
                            note.id
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                        aria-label={text("Supprimer la note", "Delete note")}
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
