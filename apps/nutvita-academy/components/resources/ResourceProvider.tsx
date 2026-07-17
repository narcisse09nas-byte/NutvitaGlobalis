"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";

import {
  createEmptyResourceLibraryData,
  loadResourceLibraryData,
  saveResourceLibraryData,
} from "@/lib/resource-storage";

import type {
  ResourceLibraryData,
} from "@/types/resource";

type ResourceContextValue = {
  data: ResourceLibraryData;
  isLoading: boolean;

  isFavorite: (
    resourceId: string
  ) => boolean;

  toggleFavorite: (
    resourceId: string
  ) => void;

  registerDownload: (
    resourceId: string
  ) => void;

  getDownloadCount: (
    resourceId: string
  ) => number;
};

export const ResourceContext =
  createContext<ResourceContextValue | null>(
    null
  );

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `resource-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function ResourceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } =
    useLocalAuth();

  const [data, setData] =
    useState<ResourceLibraryData>(
      createEmptyResourceLibraryData()
    );

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    if (!user) {
      setData(
        createEmptyResourceLibraryData()
      );

      setIsLoading(false);
      return;
    }

    setData(
      loadResourceLibraryData(
        user.id
      )
    );

    setIsLoading(false);
  }, [user]);

  const persist = useCallback(
    (
      updater: (
        current: ResourceLibraryData
      ) => ResourceLibraryData
    ) => {
      if (!user) {
        return;
      }

      setData((current) => {
        const updated =
          updater(current);

        saveResourceLibraryData(
          user.id,
          updated
        );

        return updated;
      });
    },
    [user]
  );

  const isFavorite =
    useCallback(
      (resourceId: string) =>
        data.favorites.some(
          (favorite) =>
            favorite.resourceId ===
            resourceId
        ),
      [data.favorites]
    );

  const toggleFavorite =
    useCallback(
      (resourceId: string) => {
        persist((current) => {
          const exists =
            current.favorites.some(
              (favorite) =>
                favorite.resourceId ===
                resourceId
            );

          if (exists) {
            return {
              ...current,

              favorites:
                current.favorites.filter(
                  (favorite) =>
                    favorite.resourceId !==
                    resourceId
                ),
            };
          }

          return {
            ...current,

            favorites: [
              {
                resourceId,
                createdAt:
                  new Date().toISOString(),
              },

              ...current.favorites,
            ],
          };
        });
      },
      [persist]
    );

  const registerDownload =
    useCallback(
      (resourceId: string) => {
        persist((current) => ({
          ...current,

          downloads: [
            {
              id: createId(),
              resourceId,
              downloadedAt:
                new Date().toISOString(),
            },

            ...current.downloads,
          ].slice(0, 200),
        }));
      },
      [persist]
    );

  const getDownloadCount =
    useCallback(
      (resourceId: string) =>
        data.downloads.filter(
          (download) =>
            download.resourceId ===
            resourceId
        ).length,
      [data.downloads]
    );

  const value = useMemo(
    () => ({
      data,
      isLoading,
      isFavorite,
      toggleFavorite,
      registerDownload,
      getDownloadCount,
    }),
    [
      data,
      isLoading,
      isFavorite,
      toggleFavorite,
      registerDownload,
      getDownloadCount,
    ]
  );

  return (
    <ResourceContext.Provider
      value={value}
    >
      {children}
    </ResourceContext.Provider>
  );
}