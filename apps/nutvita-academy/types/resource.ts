export type ResourceType =
  | "pdf"
  | "guide"
  | "presentation"
  | "checklist"
  | "protocol"
  | "link"
  | "video";

export type ResourceLanguage =
  | "fr"
  | "en"
  | "bilingual";

export type AcademyResource = {
  id: string;
  title: string;
  description: string;

  type: ResourceType;
  language: ResourceLanguage;

  courseSlug: string;
  courseTitle: string;

  moduleSlug?: string;
  moduleTitle?: string;

  href: string;
  fileSize?: string;
  durationMinutes?: number;

  tags: string[];
  featured: boolean;
  publishedAt: string;
};

export type ResourceFavorite = {
  resourceId: string;
  createdAt: string;
};

export type ResourceDownload = {
  id: string;
  resourceId: string;
  downloadedAt: string;
};

export type ResourceLibraryData = {
  version: 1;
  favorites: ResourceFavorite[];
  downloads: ResourceDownload[];
};

export type ResourceFiltersValue = {
  search: string;
  type: ResourceType | "all";
  language: ResourceLanguage | "all";
  courseSlug: string | "all";
  favoritesOnly: boolean;
};