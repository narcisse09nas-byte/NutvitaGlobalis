"use client";

import {
  Bookmark,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

type VideoControlsProps = {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;

  onTogglePlayback: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (
    rate: number
  ) => void;

  onSeekBackward: () => void;
  onSeekForward: () => void;
  onFullscreen: () => void;
  onPictureInPicture: () => void;
  onAddBookmark: () => void;
};

const playbackRates = [
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  1.75,
  2,
];

export function VideoControls({
  isPlaying,
  isMuted,
  volume,
  playbackRate,
  isFullscreen,
  onTogglePlayback,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  onSeekBackward,
  onSeekForward,
  onFullscreen,
  onPictureInPicture,
  onAddBookmark,
}: VideoControlsProps) {
  const { text } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlayback}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F58220] text-white transition hover:bg-orange-600"
          aria-label={
            isPlaying
              ? text("Mettre en pause", "Pause")
              : text("Lire la vidéo", "Play video")
          }
        >
          {isPlaying ? (
            <Pause size={21} />
          ) : (
            <Play
              size={21}
              className="ml-0.5"
            />
          )}
        </button>

        <button
          type="button"
          onClick={onSeekBackward}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={text("Reculer de 10 secondes", "Go back 10 seconds")}
        >
          <RotateCcw size={20} />
        </button>

        <button
          type="button"
          onClick={onSeekForward}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={text("Avancer de 10 secondes", "Go forward 10 seconds")}
        >
          <RotateCw size={20} />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={
            isMuted
              ? text("Activer le son", "Unmute")
              : text("Couper le son", "Mute")
          }
        >
          {isMuted ? (
            <VolumeX size={20} />
          ) : (
            <Volume2 size={20} />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={(event) =>
            onVolumeChange(
              Number(event.target.value)
            )
          }
          className="hidden w-24 accent-[#F58220] sm:block"
          aria-label="Volume"
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={playbackRate}
          onChange={(event) =>
            onPlaybackRateChange(
              Number(event.target.value)
            )
          }
          className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none"
          aria-label={text("Vitesse de lecture", "Playback speed")}
        >
          {playbackRates.map((rate) => (
            <option
              key={rate}
              value={rate}
              className="text-slate-900"
            >
              {rate}×
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onAddBookmark}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={text("Ajouter un signet", "Add bookmark")}
        >
          <Bookmark size={20} />
        </button>

        <button
          type="button"
          onClick={onPictureInPicture}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={text("Image dans l’image", "Picture in picture")}
        >
          <PictureInPicture2 size={20} />
        </button>

        <button
          type="button"
          onClick={onFullscreen}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label={text("Plein écran", "Full screen")}
        >
          {isFullscreen ? (
            <Minimize size={20} />
          ) : (
            <Maximize size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
