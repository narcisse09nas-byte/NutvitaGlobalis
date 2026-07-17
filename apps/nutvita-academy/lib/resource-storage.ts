import type {
  ResourceLibraryData,
} from "@/types/resource";

const STORAGE_PREFIX =
  "nutvita-resource-library";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorageKey(
  userId: string
): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function createEmptyResourceLibraryData(): ResourceLibraryData {
  return {
    version: 1,
    favorites: [],
    downloads: [],
  };
}

export function loadResourceLibraryData(
  userId: string
): ResourceLibraryData {
  if (!isBrowser()) {
    return createEmptyResourceLibraryData();
  }

  try {
    const stored =
      localStorage.getItem(
        getStorageKey(userId)
      );

    if (!stored) {
      return createEmptyResourceLibraryData();
    }

    const parsed =
      JSON.parse(
        stored
      ) as ResourceLibraryData;

    return {
      version: 1,
      favorites:
        parsed.favorites ?? [],
      downloads:
        parsed.downloads ?? [],
    };
  } catch {
    return createEmptyResourceLibraryData();
  }
}

export function saveResourceLibraryData(
  userId: string,
  data: ResourceLibraryData
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(data)
  );
}