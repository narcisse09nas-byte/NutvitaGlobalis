"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BookmarkPlus,
  Film,
} from "lucide-react";

import type {
  TranscriptSegment,
  VideoBookmark,
  VideoResource,
} from "@/types/video";

import {
  loadVideoBookmarks,
  loadVideoState,
  saveVideoBookmarks,
  saveVideoState,
} from "@/lib/video-storage";
import { isLocalMediaUrl, resolveLocalMedia } from "@/lib/local-media-storage";

import { useVideoPlayer } from "@/hooks/use-video-player";
import { useLanguage } from "@/hooks/use-language";

import { VideoControls } from "@/components/player/VideoControls";
import { VideoProgressBar } from "@/components/player/VideoProgressBar";
import { VideoTranscript } from "@/components/player/VideoTranscript";
import { VideoBookmarks } from "@/components/player/VideoBookmarks";
import { VideoResources } from "@/components/player/VideoResources";

type ProfessionalVideoPlayerProps = {
  userId: string;
  videoKey: string;

  title: string;
  src?: string;
  poster?: string;

  transcript?: TranscriptSegment[];
  resources?: VideoResource[];

  onProgress?: (
    progressPercent: number,
    currentTimeSeconds: number,
    additionalTimeSeconds: number
  ) => void;

  onComplete?: () => void;
};

type ActiveTab =
  | "transcript"
  | "bookmarks"
  | "resources";

export function ProfessionalVideoPlayer({
  userId,
  videoKey,
  title,
  src,
  poster,
  transcript = [],
  resources = [],
  onProgress,
  onComplete,
}: ProfessionalVideoPlayerProps) {
  const { text } = useLanguage();
  const [resolvedSource, setResolvedSource] = useState(src);

  useEffect(() => {
    let objectUrl = "";
    if (!src || !isLocalMediaUrl(src)) {
      setResolvedSource(src);
      return;
    }
    void resolveLocalMedia(src).then((url) => {
      objectUrl = url;
      setResolvedSource(url);
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const completionSentRef =
    useRef(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [bookmarks, setBookmarks] =
    useState<VideoBookmark[]>([]);

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("transcript");

  const player = useVideoPlayer({
    videoRef,
    containerRef,
  });

  const saveCurrentState =
    useCallback(
      (
        additionalTimeSeconds = 0
      ) => {
        const video = videoRef.current;

        if (!video) {
          return;
        }

        const safeDuration =
          Number.isFinite(video.duration)
            ? video.duration
            : 0;

        const percentage =
          safeDuration > 0
            ? Math.round(
                (video.currentTime /
                  safeDuration) *
                  100
              )
            : 0;

        saveVideoState(
          userId,
          videoKey,
          {
            currentTimeSeconds:
              video.currentTime,
            durationSeconds:
              safeDuration,
            progressPercent:
              percentage,
            volume: video.volume,
            playbackRate:
              video.playbackRate,
            muted: video.muted,
            updatedAt:
              new Date().toISOString(),
          }
        );

        onProgress?.(
          percentage,
          video.currentTime,
          additionalTimeSeconds
        );

        if (
          percentage >= 95 &&
          !completionSentRef.current
        ) {
          completionSentRef.current = true;
          onComplete?.();
        }
      },
      [
        onComplete,
        onProgress,
        userId,
        videoKey,
      ]
    );

  useEffect(() => {
    setBookmarks(
      loadVideoBookmarks(
        userId,
        videoKey
      )
    );
  }, [userId, videoKey]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        const video = videoRef.current;

        if (
          video &&
          !video.paused &&
          !video.ended
        ) {
          saveCurrentState(15);
        }
      }, 15000);

    return () => {
      window.clearInterval(interval);
      saveCurrentState(0);
    };
  }, [saveCurrentState]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      const target =
        event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (key === " ") {
        event.preventDefault();
        void player.togglePlayback();
      }

      if (key === "arrowleft") {
        player.seekBy(-10);
      }

      if (key === "arrowright") {
        player.seekBy(10);
      }

      if (key === "m") {
        player.toggleMute();
      }

      if (key === "f") {
        void player.toggleFullscreen();
      }

      if (key === "b") {
        addBookmark();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  });

  function handleLoadedMetadata() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setDuration(video.duration);

    const storedState =
      loadVideoState(
        userId,
        videoKey
      );

    if (storedState) {
      const resumeTime = Math.min(
        storedState.currentTimeSeconds,
        Math.max(
          0,
          video.duration - 1
        )
      );

      video.currentTime = resumeTime;
      video.volume = storedState.volume;
      video.playbackRate =
        storedState.playbackRate;
      video.muted = storedState.muted;

      setCurrentTime(resumeTime);

      player.setVolume(
        storedState.muted
          ? 0
          : storedState.volume
      );

      player.setPlaybackRate(
        storedState.playbackRate
      );

      player.setIsMuted(
        storedState.muted
      );
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setCurrentTime(
      video.currentTime
    );
  }

  function handleEnded() {
    player.setIsPlaying(false);
    saveCurrentState(0);

    if (!completionSentRef.current) {
      completionSentRef.current = true;
      onComplete?.();
    }
  }

  function addBookmark() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const label =
      window.prompt(
        text("Titre du signet :", "Bookmark title:"),
        text(
          `Point important à ${Math.floor(video.currentTime / 60)} min`,
          `Important point at ${Math.floor(video.currentTime / 60)} min`,
        ),
      );

    if (!label?.trim()) {
      return;
    }

    const bookmark: VideoBookmark = {
      id:
        typeof crypto !== "undefined" &&
        crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),

      timeSeconds:
        video.currentTime,

      label: label.trim(),

      createdAt:
        new Date().toISOString(),
    };

    const updated = [
      ...bookmarks,
      bookmark,
    ].sort(
      (first, second) =>
        first.timeSeconds -
        second.timeSeconds
    );

    setBookmarks(updated);

    saveVideoBookmarks(
      userId,
      videoKey,
      updated
    );

    setActiveTab("bookmarks");
  }

  function deleteBookmark(
    bookmarkId: string
  ) {
    const updated =
      bookmarks.filter(
        (bookmark) =>
          bookmark.id !== bookmarkId
      );

    setBookmarks(updated);

    saveVideoBookmarks(
      userId,
      videoKey,
      updated
    );
  }

  if (!resolvedSource) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[24px] bg-[#063D2E] px-6 text-center text-white">
        <div>
          <Film
            size={52}
            className="mx-auto text-[#F58220]"
          />

          <h3 className="mt-5 text-xl font-extrabold">
            {text("Vidéo bientôt disponible", "Video coming soon")}
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-green-100">
            {text(
              "Ajoutez l’adresse de la vidéo dans le fichier data/lesson-media.ts.",
              "Add the video address in data/lesson-media.ts.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        ref={containerRef}
        className="group relative overflow-hidden rounded-[24px] bg-black shadow-xl"
      >
        <video
          ref={videoRef}
          src={resolvedSource}
          poster={poster}
          preload="metadata"
          playsInline
          className="aspect-video w-full bg-black object-contain"
          onLoadedMetadata={
            handleLoadedMetadata
          }
          onTimeUpdate={
            handleTimeUpdate
          }
          onPlay={() =>
            player.setIsPlaying(true)
          }
          onPause={() => {
            player.setIsPlaying(false);
            saveCurrentState(0);
          }}
          onEnded={handleEnded}
          onClick={() =>
            void player.togglePlayback()
          }
        >
          {text(
            "Votre navigateur ne prend pas en charge la lecture vidéo.",
            "Your browser does not support video playback.",
          )}
        </video>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-4 pt-16 opacity-100 transition md:px-6">
          <VideoProgressBar
            currentTime={currentTime}
            duration={duration}
            onSeek={player.seekTo}
          />

          <div className="mt-3">
            <VideoControls
              isPlaying={player.isPlaying}
              isMuted={player.isMuted}
              volume={player.volume}
              playbackRate={
                player.playbackRate
              }
              isFullscreen={
                player.isFullscreen
              }
              onTogglePlayback={() =>
                void player.togglePlayback()
              }
              onToggleMute={
                player.toggleMute
              }
              onVolumeChange={
                player.setVolume
              }
              onPlaybackRateChange={
                player.setPlaybackRate
              }
              onSeekBackward={() =>
                player.seekBy(-10)
              }
              onSeekForward={() =>
                player.seekBy(10)
              }
              onFullscreen={() =>
                void player.toggleFullscreen()
              }
              onPictureInPicture={() =>
                void player.togglePictureInPicture()
              }
              onAddBookmark={addBookmark}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-black/65 px-4 py-2 text-sm font-bold text-white backdrop-blur">
          {title}
        </div>
      </div>

      <div className="rounded-[24px] border border-green-100 bg-white p-5">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() =>
              setActiveTab("transcript")
            }
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === "transcript"
                ? "bg-[#0B5D3B] text-white"
                : "bg-[#F8FAFC] text-slate-600"
            }`}
          >
            Transcription
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("bookmarks")
            }
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === "bookmarks"
                ? "bg-[#0B5D3B] text-white"
                : "bg-[#F8FAFC] text-slate-600"
            }`}
          >
            Signets ({bookmarks.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("resources")
            }
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === "resources"
                ? "bg-[#0B5D3B] text-white"
                : "bg-[#F8FAFC] text-slate-600"
            }`}
          >
            Ressources ({resources.length})
          </button>

          <button
            type="button"
            onClick={addBookmark}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-[#0B5D3B] px-4 py-2 text-sm font-bold text-[#0B5D3B]"
          >
            <BookmarkPlus size={17} />
            Ajouter un signet
          </button>
        </div>

        <div className="pt-5">
          {activeTab === "transcript" && (
            <VideoTranscript
              transcript={transcript}
              currentTime={currentTime}
              onSeek={player.seekTo}
            />
          )}

          {activeTab === "bookmarks" && (
            <VideoBookmarks
              bookmarks={bookmarks}
              onSeek={player.seekTo}
              onDelete={deleteBookmark}
            />
          )}

          {activeTab === "resources" && (
            <VideoResources
              resources={resources}
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-[#F8FAFC] px-5 py-4 text-xs leading-6 text-slate-500">
        {text(
          "Raccourcis : espace = lecture/pause, ← et → = avancer ou reculer de 10 secondes, M = couper le son, F = plein écran et B = ajouter un signet.",
          "Shortcuts: space = play/pause, ← and → = move 10 seconds, M = mute, F = full screen and B = add bookmark.",
        )}
      </div>
    </div>
  );
}
