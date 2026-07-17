import type {
  VideoBookmark,
  VideoPlaybackState,
} from "@/types/video";

const VIDEO_STATE_PREFIX =
  "nutvita-video-state";

const VIDEO_BOOKMARK_PREFIX =
  "nutvita-video-bookmarks";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStateKey(
  userId: string,
  videoKey: string
): string {
  return `${VIDEO_STATE_PREFIX}:${userId}:${videoKey}`;
}

function getBookmarkKey(
  userId: string,
  videoKey: string
): string {
  return `${VIDEO_BOOKMARK_PREFIX}:${userId}:${videoKey}`;
}

export function loadVideoState(
  userId: string,
  videoKey: string
): VideoPlaybackState | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const value = localStorage.getItem(
      getStateKey(userId, videoKey)
    );

    if (!value) {
      return null;
    }

    return JSON.parse(
      value
    ) as VideoPlaybackState;
  } catch {
    return null;
  }
}

export function saveVideoState(
  userId: string,
  videoKey: string,
  state: VideoPlaybackState
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getStateKey(userId, videoKey),
    JSON.stringify(state)
  );
}

export function loadVideoBookmarks(
  userId: string,
  videoKey: string
): VideoBookmark[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const value = localStorage.getItem(
      getBookmarkKey(userId, videoKey)
    );

    if (!value) {
      return [];
    }

    return JSON.parse(
      value
    ) as VideoBookmark[];
  } catch {
    return [];
  }
}

export function saveVideoBookmarks(
  userId: string,
  videoKey: string,
  bookmarks: VideoBookmark[]
): void {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    getBookmarkKey(userId, videoKey),
    JSON.stringify(bookmarks)
  );
}

export function formatVideoTime(
  seconds: number
): string {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "00:00";
  }

  const totalSeconds =
    Math.floor(seconds);

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      minutes.toString().padStart(2, "0"),
      remainingSeconds
        .toString()
        .padStart(2, "0"),
    ].join(":");
  }

  return [
    minutes.toString().padStart(2, "0"),
    remainingSeconds
      .toString()
      .padStart(2, "0"),
  ].join(":");
}