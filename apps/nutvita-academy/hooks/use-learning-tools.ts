"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";

import {
  createEmptyLearningToolsData,
  createFavoriteLesson,
  createHistoryEntry,
  createLessonNote,
  loadLearningToolsData,
  saveLearningToolsData,
} from "@/lib/learning-tools-storage";

import type {
  LearningToolsData,
  LessonReference,
} from "@/types/learning-tools";

export function useLearningTools() {
  const { user } = useLocalAuth();

  const [data, setData] =
    useState<LearningToolsData>(
      createEmptyLearningToolsData()
    );

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    if (!user) {
      setData(
        createEmptyLearningToolsData()
      );

      setIsLoading(false);
      return;
    }

    setData(
      loadLearningToolsData(user.id)
    );

    setIsLoading(false);
  }, [user]);

  const persist = useCallback(
    (
      updater: (
        current: LearningToolsData
      ) => LearningToolsData
    ) => {
      if (!user) {
        return;
      }

      setData((current) => {
        const updated =
          updater(current);

        saveLearningToolsData(
          user.id,
          updated
        );

        return updated;
      });
    },
    [user]
  );

  const addNote = useCallback(
    (
      reference: LessonReference,
      content: string,
      videoTimeSeconds?: number
    ) => {
      if (!user || !content.trim()) {
        return;
      }

      const note =
        createLessonNote(
          user.id,
          reference,
          content.trim(),
          videoTimeSeconds
        );

      persist((current) => ({
        ...current,
        notes: [
          note,
          ...current.notes,
        ],
      }));
    },
    [persist, user]
  );

  const updateNote = useCallback(
    (
      noteId: string,
      content: string
    ) => {
      if (!content.trim()) {
        return;
      }

      persist((current) => ({
        ...current,

        notes: current.notes.map(
          (note) =>
            note.id === noteId
              ? {
                  ...note,
                  content:
                    content.trim(),
                  updatedAt:
                    new Date().toISOString(),
                }
              : note
        ),
      }));
    },
    [persist]
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      persist((current) => ({
        ...current,

        notes:
          current.notes.filter(
            (note) =>
              note.id !== noteId
          ),
      }));
    },
    [persist]
  );

  const toggleFavorite =
    useCallback(
      (
        reference: LessonReference
      ) => {
        if (!user) {
          return;
        }

        persist((current) => {
          const existing =
            current.favorites.find(
              (favorite) =>
                favorite.courseSlug ===
                  reference.courseSlug &&
                favorite.moduleSlug ===
                  reference.moduleSlug &&
                favorite.lessonSlug ===
                  reference.lessonSlug
            );

          if (existing) {
            return {
              ...current,

              favorites:
                current.favorites.filter(
                  (favorite) =>
                    favorite.id !==
                    existing.id
                ),
            };
          }

          const favorite =
            createFavoriteLesson(
              user.id,
              reference
            );

          return {
            ...current,
            favorites: [
              favorite,
              ...current.favorites,
            ],
          };
        });
      },
      [persist, user]
    );

  const isFavorite = useCallback(
    (
      courseSlug: string,
      moduleSlug: string,
      lessonSlug: string
    ) => {
      return data.favorites.some(
        (favorite) =>
          favorite.courseSlug ===
            courseSlug &&
          favorite.moduleSlug ===
            moduleSlug &&
          favorite.lessonSlug ===
            lessonSlug
      );
    },
    [data.favorites]
  );

  const addHistory = useCallback(
    (
      reference: LessonReference,
      videoTimeSeconds?: number
    ) => {
      if (!user) {
        return;
      }

      persist((current) => {
        const filtered =
          current.history.filter(
            (entry) =>
              !(
                entry.courseSlug ===
                  reference.courseSlug &&
                entry.moduleSlug ===
                  reference.moduleSlug &&
                entry.lessonSlug ===
                  reference.lessonSlug
              )
          );

        const entry =
          createHistoryEntry(
            user.id,
            reference,
            videoTimeSeconds
          );

        return {
          ...current,
          history: [
            entry,
            ...filtered,
          ].slice(0, 50),
        };
      });
    },
    [persist, user]
  );

  return {
    data,
    isLoading,

    notes: data.notes,
    favorites: data.favorites,
    history: data.history,

    addNote,
    updateNote,
    deleteNote,

    toggleFavorite,
    isFavorite,

    addHistory,
  };
}