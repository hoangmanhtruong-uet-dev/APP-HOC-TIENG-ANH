"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Headphones,
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen
} from "lucide-react";

import type { CuratedExercise } from "./listening-curated-data";

export interface QuickPracticeModalProps {
  exercise: CuratedExercise;
  playbackSpeed: number;
  onClose: () => void;
  onSeekTo: (seconds: number) => void;
  onSpeak: (text: string, lang?: string, rate?: number) => void;
}

export function QuickPracticeModal({
  exercise,
  playbackSpeed,
  onClose,
  onSeekTo,
  onSpeak
}: QuickPracticeModalProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const scoreCount = exercise.questions.reduce((count, q) => {
    const userAns = (answers[q.id] || "").trim().toLowerCase();
    return userAns === q.answer.toLowerCase() ? count + 1 : count;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-[#0C0E1D] border border-indigo-500/40 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#141731] border-b border-[#2B3060] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {exercise.section}
                </span>
                <span className="text-xs text-emerald-300 font-semibold">
                  Band {exercise.band}
                </span>
                <span className="text-xs text-zinc-400">
                  • {exercise.accent}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-0.5 tracking-tight">
                {exercise.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng bài tập"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          {/* Question List (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <span>📝 Phiếu Trả Lời Câu Hỏi (NO MORE THAN TWO WORDS)</span>
              </h4>
              {submitted && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Kết quả: {scoreCount}/{exercise.questions.length} câu đúng
                </span>
              )}
            </div>

            <div className="space-y-3">
              {exercise.questions.map((qItem, idx) => {
                const userAns = (answers[qItem.id] || "").trim().toLowerCase();
                const isCorrect = userAns === qItem.answer.toLowerCase();

                return (
                  <div
                    key={qItem.id}
                    className="p-4 rounded-2xl bg-[#141731] border border-[#2B3060] space-y-2.5 shadow-sm"
                  >
                    <div className="text-sm text-zinc-200 font-medium leading-relaxed">
                      <span className="text-indigo-400 font-bold mr-2">Câu {idx + 1}:</span>
                      {qItem.q}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={answers[qItem.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [qItem.id]: e.target.value })
                        }
                        placeholder="Nhập đáp án của bạn..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0C0E1D] border border-[#2B3060] focus:border-indigo-400 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                      />
                      {submitted && (
                        <span
                          className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 ${
                            isCorrect
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {isCorrect ? "✓ Chính xác" : `✗ Đáp án: ${qItem.answer}`}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 pt-0.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Gợi ý Paraphrase: {qItem.hint}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                onClick={() => setSubmitted(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                Chấm điểm & Giải thích chi tiết
              </button>

              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1B1F40] hover:bg-[#252A56] text-zinc-300 text-xs font-semibold border border-[#2B3060] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Làm lại</span>
              </button>

              {/* Link to Full Exercise Runner */}
              <Link
                href={`/practice/listening/${exercise.slug}`}
                className="ml-auto px-4 py-2.5 rounded-xl bg-[#F6E85C] hover:bg-[#F6E85C]/90 text-[#0C0E1D] text-xs font-extrabold flex items-center gap-1.5 shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span>Vào phòng thi đầy đủ (Full Runner)</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Interactive Live Transcript & Vocab (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                🎧 Transcript Đồng Bộ (Bấm để nghe)
              </span>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                {showTranscript ? "Ẩn Transcript" : "Hiện Transcript"}
              </button>
            </div>

            {showTranscript ? (
              <div className="p-4 rounded-2xl bg-[#141731] border border-[#2B3060] space-y-2.5 max-h-64 overflow-y-auto">
                {exercise.transcript.map((line, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onSeekTo(line.time);
                      const lang = exercise.accent.includes("US")
                        ? "en-US"
                        : exercise.accent.includes("AUS")
                        ? "en-AU"
                        : "en-GB";
                      onSpeak(line.text, lang, playbackSpeed);
                    }}
                    className="p-2.5 rounded-xl hover:bg-[#1B1F40] cursor-pointer transition-colors text-xs leading-relaxed text-zinc-300 border border-transparent hover:border-indigo-500/30"
                    title="Bấm để phát câu này"
                  >
                    <span className="text-indigo-400 font-mono font-bold mr-2 tabular-nums">
                      [{formatTime(line.time)}]
                    </span>
                    {line.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#141731] border border-[#2B3060] text-center text-xs text-zinc-400">
                Transcript đang được ẩn để rèn khả năng nghe thực chiến.
              </div>
            )}

            {/* Key Vocabulary Card */}
            {exercise.vocab.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#141731] border border-[#2B3060] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <BookOpen size={14} />
                  <span>TỪ VỰNG TRỌNG TÂM TRONG BÀI</span>
                </div>
                <div className="space-y-2">
                  {exercise.vocab.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-[#0C0E1D] border border-[#2B3060]/60 text-xs flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{v.word}</span>
                        <span className="text-cyan-400 font-mono text-[11px]">{v.ipa}</span>
                      </div>
                      <span className="text-zinc-400 text-[11px]">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
