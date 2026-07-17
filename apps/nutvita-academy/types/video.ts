export type TranscriptSegment = {
  id: string;
  startSeconds: number;
  endSeconds?: number;
  text: string;
};

export type VideoResource = {
  id: string;
  title: string;
  description?: string;
  href: string;
  type: "pdf" | "document" | "link" | "slides";
};

export type VideoBookmark = {
  id: string;
  timeSeconds: number;
  label: string;
  createdAt: string;
};

export type VideoPlaybackState = {
  currentTimeSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  volume: number;
  playbackRate: number;
  muted: boolean;
  updatedAt: string;
};

export type LessonMedia = {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  title: string;

  videoUrl?: string;
  posterUrl?: string;

  transcript: TranscriptSegment[];
  resources: VideoResource[];
};