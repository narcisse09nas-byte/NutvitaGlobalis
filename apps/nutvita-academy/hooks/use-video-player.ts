"use client";

import {
  RefObject,
  useCallback,
  useEffect,
  useState,
} from "react";

type UseVideoPlayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
};

export function useVideoPlayer({
  videoRef,
  containerRef,
}: UseVideoPlayerProps) {
  const [isPlaying, setIsPlaying] =
    useState(false);

  const [isMuted, setIsMuted] =
    useState(false);

  const [volume, setVolumeState] =
    useState(1);

  const [playbackRate, setPlaybackRateState] =
    useState(1);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const togglePlayback = useCallback(
    async () => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      try {
        if (video.paused) {
          await video.play();
        } else {
          video.pause();
        }
      } catch (error) {
        console.error(
          "Impossible de modifier la lecture :",
          error
        );
      }
    },
    [videoRef]
  );

  const seekBy = useCallback(
    (seconds: number) => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      const nextTime = Math.min(
        video.duration || 0,
        Math.max(
          0,
          video.currentTime + seconds
        )
      );

      video.currentTime = nextTime;
    },
    [videoRef]
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      video.currentTime = Math.max(
        0,
        seconds
      );
    },
    [videoRef]
  );

  const setVolume = useCallback(
    (nextVolume: number) => {
      const video = videoRef.current;

      const safeVolume = Math.min(
        1,
        Math.max(0, nextVolume)
      );

      if (video) {
        video.volume = safeVolume;
        video.muted = safeVolume === 0;
      }

      setVolumeState(safeVolume);
      setIsMuted(safeVolume === 0);
    },
    [videoRef]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;

    setIsMuted(video.muted);
  }, [videoRef]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;

      if (video) {
        video.playbackRate = rate;
      }

      setPlaybackRateState(rate);
    },
    [videoRef]
  );

  const toggleFullscreen =
    useCallback(async () => {
      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      try {
        if (!document.fullscreenElement) {
          await container.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.error(
          "Le plein écran n’est pas disponible :",
          error
        );
      }
    }, [containerRef]);

  const togglePictureInPicture =
    useCallback(async () => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      try {
        if (
          document.pictureInPictureElement
        ) {
          await document.exitPictureInPicture();
          return;
        }

        if (
          typeof video.requestPictureInPicture ===
          "function"
        ) {
          await video.requestPictureInPicture();
        }
      } catch (error) {
        console.error(
          "Le mode image dans l’image n’est pas disponible :",
          error
        );
      }
    }, [videoRef]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(
        Boolean(document.fullscreenElement)
      );
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  return {
    isPlaying,
    setIsPlaying,

    isMuted,
    setIsMuted,

    volume,
    setVolume,

    playbackRate,
    setPlaybackRate,

    isFullscreen,

    togglePlayback,
    toggleMute,
    seekBy,
    seekTo,
    toggleFullscreen,
    togglePictureInPicture,
  };
}