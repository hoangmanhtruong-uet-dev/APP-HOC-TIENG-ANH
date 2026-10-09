'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseDictationAudioProps {
  audioUrl: string;
  audioUrlLow?: string | null;
}

interface UseDictationAudioReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  isLoading: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  playSentence: (startTime: number, endTime: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  replayCount: number;
}

export function useDictationAudio({
  audioUrl,
  audioUrlLow,
}: UseDictationAudioProps): UseDictationAudioReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentenceEndRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [replayCount, setReplayCount] = useState(0);

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.src = audioUrl;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Auto-pause at sentence end
      if (
        sentenceEndRef.current !== null &&
        audio.currentTime >= sentenceEndRef.current
      ) {
        audio.pause();
        setIsPlaying(false);
        sentenceEndRef.current = null;
      }
    };

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      // Fallback to low quality
      if (audioUrlLow && audio.src !== audioUrlLow) {
        audio.src = audioUrlLow;
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, audioUrlLow]);

  const play = useCallback(() => {
    audioRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const playSentence = useCallback(
    (startTime: number, endTime: number) => {
      if (!audioRef.current) return;
      sentenceEndRef.current = endTime;
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
      setIsPlaying(true);
      setReplayCount((prev) => prev + 1);
    },
    []
  );

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setPlaybackSpeedState(speed);
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    isLoading,
    play,
    pause,
    togglePlay,
    seekTo,
    playSentence,
    setPlaybackSpeed,
    replayCount,
  };
}
