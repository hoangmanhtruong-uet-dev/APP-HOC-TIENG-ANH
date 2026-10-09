"use client";

import { useVideoProgressSync } from "../hooks/use-video-sync";

interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  posterUrl?: string;
  onEnded?: () => void;
}

export function VideoPlayer({ lessonId, videoUrl, posterUrl, onEnded }: VideoPlayerProps) {
  const { videoRef } = useVideoProgressSync({ lessonId });

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 group">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        controls
        controlsList="nodownload"
        onEnded={onEnded}
        className="w-full h-full object-contain"
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
