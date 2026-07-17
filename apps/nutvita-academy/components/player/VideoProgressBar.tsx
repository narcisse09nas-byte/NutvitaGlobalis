"use client";

import { formatVideoTime } from "@/lib/video-storage";
import { useLanguage } from "@/hooks/use-language";

type VideoProgressBarProps = {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
};

export function VideoProgressBar({
  currentTime,
  duration,
  onSeek,
}: VideoProgressBarProps) {
  const { text } = useLanguage();
  const safeDuration =
    Number.isFinite(duration) &&
    duration > 0
      ? duration
      : 0;

  const percentage =
    safeDuration === 0
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            (currentTime / safeDuration) *
              100
          )
        );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    onSeek(Number(event.target.value));
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-right text-xs font-semibold text-white">
        {formatVideoTime(currentTime)}
      </span>

      <div className="relative flex-1">
        <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/25" />

        <div
          className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#F58220]"
          style={{
            width: `${percentage}%`,
          }}
        />

        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={Math.min(
            currentTime,
            safeDuration
          )}
          onChange={handleChange}
          className="relative z-10 h-5 w-full cursor-pointer opacity-0"
          aria-label={text("Position de la vidéo", "Video position")}
        />
      </div>

      <span className="w-12 text-xs font-semibold text-white">
        {formatVideoTime(safeDuration)}
      </span>
    </div>
  );
}
