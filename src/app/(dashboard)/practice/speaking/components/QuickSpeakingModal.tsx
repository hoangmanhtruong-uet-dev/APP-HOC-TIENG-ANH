"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  Volume2,
} from "lucide-react";
import type { SpeakingCueCard } from "./speaking-curated-data";

interface QuickSpeakingModalProps {
  card: SpeakingCueCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSpeakingModal({ card, isOpen, onClose }: QuickSpeakingModalProps) {
  const [phase, setPhase] = useState<"idle" | "prep" | "recording" | "completed">("idle");
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);
  const [recordTime, setRecordTime] = useState(0);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Reset state when opening a new card
  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setPrepTimeLeft(60);
      setRecordTime(0);
      setHasRecordedAudio(false);
    }
  }, [isOpen, card]);

  // Prep timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === "prep" && prepTimeLeft > 0) {
      timer = setInterval(() => {
        setPrepTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (phase === "prep" && prepTimeLeft === 0) {
      setPhase("recording");
    }
    return () => clearInterval(timer);
  }, [phase, prepTimeLeft]);

  // Record timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === "recording") {
      timer = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase]);

  // Canvas waveform animation during recording
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "recording") {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let step = 0;
    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      step += 0.08;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#00F0FF";
      ctx.beginPath();

      for (let x = 0; x < width; x += 3) {
        const freq1 = Math.sin(x * 0.04 + step) * 16;
        const freq2 = Math.cos(x * 0.08 - step * 1.5) * 10;
        const y = mid + (freq1 + freq2) * Math.sin((x / width) * Math.PI);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Second harmonic wave
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#5B5FEF";
      ctx.beginPath();
      for (let x = 0; x < width; x += 4) {
        const freq = Math.sin(x * 0.06 - step * 2) * 12;
        const y = mid + freq * Math.sin((x / width) * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase]);

  if (!isOpen || !card) return null;

  const handleStartPrep = () => {
    setPhase("prep");
    setPrepTimeLeft(60);
  };

  const handleStartRecording = () => {
    setPhase("recording");
    setRecordTime(0);
  };

  const handleStopRecording = () => {
    setPhase("completed");
    setHasRecordedAudio(true);
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="speaking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-[#242A4E] bg-[#0C0E1D] shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#242A4E] bg-[#12162B] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-[#5B5FEF]/20 text-[#7A7DF5] border border-[#5B5FEF]/30">
              IELTS PART {card.part} STUDIO
            </span>
            <span className="text-xs font-semibold text-[#94A3B8]">Target Band {card.targetBand.toFixed(1)}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1E2442] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split-View */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#242A4E]">
          {/* Left Column: Cue Card & Vocabulary */}
          <div className="md:col-span-6 p-6 space-y-6">
            <div>
              <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-wide">
                Topic: {card.topic}
              </span>
              <h2 id="speaking-modal-title" className="text-xl font-black text-white mt-1 leading-snug">
                {card.title}
              </h2>
            </div>

            {/* Prompt Card */}
            <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5">
              <p className="text-sm font-semibold text-[#EEF0FF] mb-3">{card.prompt}</p>
              {card.bulletPoints && (
                <div className="space-y-1.5 text-xs text-[#94A3B8]">
                  <p className="font-bold text-[#A5B4FC]">You should say:</p>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    {card.bulletPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* C1/C2 Academic Vocabulary Highlights */}
            <div>
              <h4 className="text-xs font-bold text-[#A5B4FC] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#00F0FF]" /> C1/C2 Lexical Recommendations:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {card.vocabularyHighlights.map((vocab, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-[#1E2442] bg-[#12162B] text-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{vocab.word}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#5B5FEF]/30 text-[#7A7DF5]">
                          {vocab.band}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#00F0FF] mt-0.5">{vocab.ipa}</p>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1.5 line-clamp-1">{vocab.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Recording Studio & Live Acoustic Meter */}
          <div className="md:col-span-6 p-6 flex flex-col justify-between space-y-6 bg-[#080A14]">
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    phase === "recording"
                      ? "bg-rose-500 animate-ping"
                      : phase === "prep"
                      ? "bg-amber-400 animate-pulse"
                      : "bg-[#00F0FF]"
                  }`}
                />
                <span className="font-mono text-xs font-bold text-[#EEF0FF] uppercase tracking-wider">
                  {phase === "idle" && "Studio Standby"}
                  {phase === "prep" && "1-Minute Prep Phase"}
                  {phase === "recording" && `Live Recording (${formatSecs(recordTime)})`}
                  {phase === "completed" && "Evaluation Ready"}
                </span>
              </div>

              {phase === "recording" && (
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  REC ●
                </span>
              )}
            </div>

            {/* Audio Waveform Canvas Box */}
            <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col items-center justify-center min-h-[180px]">
              {phase === "idle" && (
                <div className="text-center space-y-2">
                  <div className="size-14 rounded-full bg-[#5B5FEF]/20 text-[#7A7DF5] mx-auto flex items-center justify-center">
                    <Mic size={24} />
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Sẵn sàng ghi âm. Bạn có thể chọn chuẩn bị 60s hoặc bắt đầu nói trực tiếp.
                  </p>
                </div>
              )}

              {phase === "prep" && (
                <div className="text-center space-y-2">
                  <span className="text-5xl font-mono font-black text-amber-400 animate-pulse">
                    {prepTimeLeft}s
                  </span>
                  <p className="text-xs text-[#94A3B8]">
                    Thời gian chuẩn bị 1 phút. Hãy hình dung cấu trúc 4 ý và từ vựng then chốt.
                  </p>
                </div>
              )}

              {phase === "recording" && (
                <div className="w-full space-y-3">
                  <canvas ref={canvasRef} width={340} height={80} className="w-full h-[80px]" />
                  <p className="text-center font-mono text-xs text-[#00F0FF]">
                    Thu âm đang hoạt động: {formatSecs(recordTime)} / 02:00
                  </p>
                </div>
              )}

              {phase === "completed" && (
                <div className="text-center space-y-3 w-full">
                  <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Đã hoàn thành bài nói!</h4>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Thời lượng: {formatSecs(recordTime)}</p>
                  </div>

                  {/* Simulated IELTS Criteria Score Breakdown */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1E2442] text-center">
                    <div className="p-2 rounded-lg bg-[#0C0E1D]">
                      <span className="text-[10px] text-[#94A3B8] block">Fluency</span>
                      <strong className="text-xs text-[#00F0FF] font-mono">7.5</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0E1D]">
                      <span className="text-[10px] text-[#94A3B8] block">Lexical</span>
                      <strong className="text-xs text-[#7A7DF5] font-mono">8.0</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0E1D]">
                      <span className="text-[10px] text-[#94A3B8] block">Grammar</span>
                      <strong className="text-xs text-amber-400 font-mono">7.0</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C0E1D]">
                      <span className="text-[10px] text-[#94A3B8] block">Pronun</span>
                      <strong className="text-xs text-emerald-400 font-mono">7.5</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {phase === "idle" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleStartPrep}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-[#1E2442] hover:bg-[#2A335E] text-[#EEF0FF] border border-[#242A4E] transition-all"
                  >
                    Chuẩn bị 60s (Part 2)
                  </button>
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-[#5B5FEF] hover:bg-[#4D51DE] text-white flex items-center justify-center gap-2 shadow-lg shadow-[#5B5FEF]/25 transition-all"
                  >
                    <Mic size={15} /> Bắt đầu nói ngay
                  </button>
                </div>
              )}

              {phase === "prep" && (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-[#5B5FEF] hover:bg-[#4D51DE] text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Mic size={15} /> Bỏ qua chuẩn bị & Bắt đầu nói
                </button>
              )}

              {phase === "recording" && (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all"
                >
                  <Square size={15} /> Kết thúc bài nói
                </button>
              )}

              {phase === "completed" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhase("idle")}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#1E2442] text-[#94A3B8] hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCcw size={14} /> Nói lại
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 size={14} /> Hoàn tất & Lưu nháp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
