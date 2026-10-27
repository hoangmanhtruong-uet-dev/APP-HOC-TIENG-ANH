"use client";

import { useEffect, useRef } from "react";
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Repeat
} from "lucide-react";

import type { AmbientNoise } from "./ThreeSonicVisualizer";

export interface FloatingAudioTrack {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
  bandRange: string;
  durationSec: number;
  audioUrl?: string;
}

export interface FloatingAudioDockProps {
  currentTrack: FloatingAudioTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  ambientNoise: AmbientNoise;
  isDockMinimized: boolean;
  isMuted: boolean;
  abLoop: boolean;
  currentTranscriptLine: string;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSeekTo: (newTime: number) => void;
  onChangeSpeed: () => void;
  onToggleMute: () => void;
  onToggleAbLoop: () => void;
  onSetAmbientNoise: (noise: AmbientNoise) => void;
  onSetDockMinimized: (minimized: boolean) => void;
}

export function FloatingAudioDock({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  ambientNoise,
  isDockMinimized,
  isMuted,
  abLoop,
  currentTranscriptLine,
  onTogglePlay,
  onSeek,
  onSeekTo,
  onChangeSpeed,
  onToggleMute,
  onToggleAbLoop,
  onSetAmbientNoise,
  onSetDockMinimized
}: FloatingAudioDockProps) {
  // Web Audio API Ambient Noise Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (ambientNoise === "off") {
      if (noiseGainRef.current) {
        noiseGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current?.currentTime ?? 0, 0.2);
      }
      return;
    }

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop previous
      if (noiseSourceRef.current) {
        try {
          (noiseSourceRef.current as AudioBufferSourceNode).stop();
        } catch {}
      }

      // Generate 2 seconds of pink/brownian noise loop
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brownian noise integration
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.5; // Gain compensation
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (ambientNoise === "exam") {
        filter.type = "lowpass";
        filter.frequency.value = 350; // Low frequency quiet room hum
      } else {
        filter.type = "bandpass";
        filter.frequency.value = 800; // Cafe mid-frequency chatter
      }

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start();

      noiseSourceRef.current = whiteNoise;
      noiseGainRef.current = gainNode;
    } catch {
      // AudioContext not allowed or not supported in environment
    }

    return () => {
      if (noiseGainRef.current && audioCtxRef.current) {
        try {
          noiseGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        } catch {}
      }
    };
  }, [ambientNoise]);

  const formatTime = (sec: number) => {
    const safeSec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 px-4 pointer-events-none flex justify-center">
      {isDockMinimized ? (
        /* Compact Pill Button */
        <button
          onClick={() => onSetDockMinimized(false)}
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#101436]/95 backdrop-blur-2xl border border-indigo-400/40 shadow-2xl shadow-indigo-950 text-xs font-bold text-white hover:scale-105 transition-all duration-300"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isPlaying ? "bg-emerald-400 animate-ping" : "bg-indigo-400"
            }`}
          />
          <span className="truncate max-w-[180px]">{currentTrack.title}</span>
          <span className="text-indigo-300 font-mono tabular-nums">{formatTime(currentTime)}</span>
          <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      ) : (
        /* Full Cyber Audio Dock */
        <div className="pointer-events-auto w-full max-w-4xl rounded-3xl bg-[#101436]/95 backdrop-blur-2xl border border-[#2B3060] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-3.5 sm:px-5 sm:py-3.5 transition-all">
          {/* Subtitle Script Ticker & Ambient Simulator */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[#2B3060]/60 text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold shrink-0 text-[10px] uppercase tracking-wider">
                LIVE SCRIPT
              </span>
              <span className="text-zinc-300 italic truncate max-w-[280px] sm:max-w-md">
                "{currentTranscriptLine || "Sẵn sàng nghe bài tập..."}"
              </span>
            </div>

            {/* Ambient Noise Selector */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-xs">
              <span className="text-zinc-400 text-[11px]">Môi trường:</span>
              {[
                { id: "off" as const, label: "Phòng thu (Chuẩn)" },
                { id: "exam" as const, label: "Phòng thi" },
                { id: "cafe" as const, label: "Quán Cafe" }
              ].map((env) => (
                <button
                  key={env.id}
                  onClick={() => onSetAmbientNoise(env.id)}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-colors ${
                    ambientNoise === env.id
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {env.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? "Tạm dừng" : "Phát âm thanh"}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-transform"
              >
                <Headphones className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${
                      isPlaying ? "animate-ping" : ""
                    }`}
                  />
                  <span>{isPlaying ? "ĐANG PHÁT" : "SẴN SÀNG"}</span>
                  <span className="text-zinc-400">• {currentTrack.accent}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[220px]">
                  {currentTrack.title}
                </div>
              </div>

              {/* Mobile Minimize */}
              <button
                onClick={() => onSetDockMinimized(true)}
                className="sm:hidden p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
                title="Thu gọn"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Scrub Timeline */}
            <div className="flex items-center gap-3 w-full sm:flex-1 max-w-md">
              <span className="text-[11px] font-mono text-zinc-400 w-9 text-right tabular-nums">
                {formatTime(currentTime)}
              </span>

              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeekTo(Math.floor(clickRatio * duration));
                }}
                className="flex-1 h-2 bg-[#0C0E1D] border border-[#2B3060]/50 rounded-full overflow-hidden cursor-pointer relative group"
                title="Click để tua"
              >
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-[#F6E85C] rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-zinc-400 w-9 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>

            {/* Button Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSeek(-5)}
                title="Tua lùi 5 giây"
                aria-label="Tua lùi 5 giây"
                className="p-2 rounded-xl hover:bg-white/[0.08] text-zinc-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                className="w-10 h-10 rounded-full bg-white text-[#0C0E1D] hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg font-bold transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => onSeek(5)}
                title="Tua tới 5 giây"
                aria-label="Tua tới 5 giây"
                className="p-2 rounded-xl hover:bg-white/[0.08] text-zinc-300 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-[#2B3060] mx-1" />

              {/* Speed Multiplier */}
              <button
                onClick={onChangeSpeed}
                title="Tốc độ nghe"
                className="px-2.5 py-1.5 rounded-xl bg-[#1B1F40] hover:bg-[#252A56] border border-[#2B3060] text-xs font-mono font-bold text-indigo-300 transition-colors tabular-nums"
              >
                {playbackSpeed}x
              </button>

              {/* A-B Loop */}
              <button
                onClick={onToggleAbLoop}
                title="Lặp lại câu (Loop)"
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                  abLoop
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-[#1B1F40] border-[#2B3060] text-zinc-400 hover:text-white"
                }`}
              >
                <Repeat size={12} />
                <span>A-B</span>
              </button>

              {/* Mute */}
              <button
                onClick={onToggleMute}
                title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
                className="p-2 rounded-xl hover:bg-white/[0.08] text-zinc-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Desktop Minimize */}
              <button
                onClick={() => onSetDockMinimized(true)}
                title="Thu gọn thanh phát"
                className="hidden sm:flex p-2 rounded-xl hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
