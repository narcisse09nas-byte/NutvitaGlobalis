"use client";

import type {
  TranscriptSegment,
} from "@/types/video";

import { formatVideoTime } from "@/lib/video-storage";
import { useLanguage } from "@/hooks/use-language";

type VideoTranscriptProps = {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
};

export function VideoTranscript({
  transcript,
  currentTime,
  onSeek,
}: VideoTranscriptProps) {
  const { text } = useLanguage();
  if (transcript.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {text("Aucune transcription disponible pour cette vidéo.", "No transcript available for this video.")}
      </p>
    );
  }

  return (
    <div className="max-h-[430px] space-y-2 overflow-y-auto pr-2">
      {transcript.map((segment) => {
        const active =
          currentTime >=
            segment.startSeconds &&
          (segment.endSeconds === undefined ||
            currentTime <
              segment.endSeconds);

        return (
          <button
            key={segment.id}
            type="button"
            onClick={() =>
              onSeek(segment.startSeconds)
            }
            className={`w-full rounded-2xl p-4 text-left transition ${
              active
                ? "bg-[#DDF5E8] ring-1 ring-[#0B5D3B]"
                : "bg-[#F8FAFC] hover:bg-green-50"
            }`}
          >
            <span className="text-xs font-extrabold text-[#F58220]">
              {formatVideoTime(
                segment.startSeconds
              )}
            </span>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {segment.text}
            </p>
          </button>
        );
      })}
    </div>
  );
}
