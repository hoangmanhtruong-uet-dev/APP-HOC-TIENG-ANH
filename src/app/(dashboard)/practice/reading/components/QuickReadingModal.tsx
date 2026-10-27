"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookA,
  Clock,
  Layers,
  ZoomIn,
  ZoomOut
} from "lucide-react";

import type { CuratedPassage } from "./reading-curated-data";

export interface QuickReadingModalProps {
  passage: CuratedPassage;
  onClose: () => void;
}

export function QuickReadingModal({ passage, onClose }: QuickReadingModalProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  const fontSizeClass =
    fontSize === "sm" ? "text-xs leading-relaxed" : fontSize === "lg" ? "text-base leading-loose" : "text-sm leading-relaxed";

  const scoreCount = passage.questions.reduce((count, q) => {
    const userAns = (answers[q.id] || "").trim().toUpperCase();
    return userAns === q.answer.trim().toUpperCase() ? count + 1 : count;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl bg-[#0C0E1D] border border-indigo-500/40 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#141731] border-b border-[#2B3060] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Passage {passage.passageNumber}
                </span>
                <span className="text-xs text-emerald-300 font-semibold">
                  Band {passage.bandRange}
                </span>
                <span className="text-xs text-zinc-400">
                  • {passage.category}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5 tracking-tight truncate max-w-lg">
                {passage.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font Scaler */}
            <div className="hidden sm:flex items-center gap-1 bg-[#0C0E1D] p-1 rounded-xl border border-[#2B3060]">
              <button
                onClick={() => setFontSize("sm")}
                title="Cỡ chữ nhỏ"
                className={`p-1.5 rounded-lg text-xs font-bold ${fontSize === "sm" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={() => setFontSize("base")}
                title="Cỡ chữ vừa"
                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${fontSize === "base" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize("lg")}
                title="Cỡ chữ lớn"
                className={`p-1.5 rounded-lg text-xs font-bold ${fontSize === "lg" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                <ZoomIn size={13} />
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Đóng bài đọc"
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Split-View Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#2B3060]">
          {/* LEFT COLUMN: PASSAGE TEXT (7 COLS) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto space-y-6 max-h-[45vh] lg:max-h-full">
            <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-[#2B3060]/60">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-400" />
                Thời gian đọc chuẩn: ~{passage.estimatedMinutes} phút
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Layers size={14} className="text-indigo-400" />
                {passage.wordCount} từ
              </span>
            </div>

            <div className={`space-y-5 text-zinc-200 font-serif ${fontSizeClass}`}>
              {passage.paragraphs.map((para) => (
                <div key={para.id} className="space-y-1.5">
                  <span className="inline-block text-xs font-sans font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {para.label}
                  </span>
                  <p className="indent-4 leading-relaxed text-zinc-200">{para.text}</p>
                </div>
              ))}
            </div>

            {/* Vocab Glossary */}
            {passage.vocab.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#141731] border border-[#2B3060] space-y-2 mt-6">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <BookA size={14} />
                  <span>TỪ VỰNG TRỌNG TÂM TRONG BÀI</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passage.vocab.map((v, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-[#0C0E1D] border border-[#2B3060]/50 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{v.word}</span>
                        <span className="text-cyan-400 font-mono text-[10px]">{v.ipa}</span>
                      </div>
                      <div className="text-zinc-400 text-[11px]">{v.meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: QUESTION SHEET (5 COLS) */}
          <div className="lg:col-span-5 p-6 overflow-y-auto space-y-5 flex flex-col justify-between max-h-[45vh] lg:max-h-full bg-[#0C0E1D]/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  📝 Phiếu Câu Hỏi Thực Chiến ({passage.questions.length} câu)
                </h4>
                {submitted && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {scoreCount}/{passage.questions.length} câu đúng
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {passage.questions.map((qItem, idx) => {
                  const userAns = (answers[qItem.id] || "").trim().toUpperCase();
                  const isCorrect = userAns === qItem.answer.trim().toUpperCase();

                  return (
                    <div
                      key={qItem.id}
                      className="p-4 rounded-2xl bg-[#141731] border border-[#2B3060] space-y-2.5 shadow-sm"
                    >
                      <div className="text-xs font-semibold text-zinc-200 leading-relaxed">
                        <span className="text-indigo-400 font-bold mr-1.5">Q{idx + 1}:</span>
                        {qItem.q}
                      </div>

                      {/* True/False/Not Given quick pills */}
                      {qItem.type === "true_false_not_given" ? (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {(["TRUE", "FALSE", "NOT GIVEN"] as const).map((opt) => {
                            const isChosen = userAns === opt;
                            let optStyle = "bg-[#0C0E1D] border-[#2B3060] text-zinc-300 hover:text-white";
                            if (submitted) {
                              if (opt === qItem.answer) optStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300";
                              else if (isChosen) optStyle = "bg-rose-500/20 border-rose-400 text-rose-300";
                            } else if (isChosen) {
                              optStyle = "bg-indigo-600 border-indigo-500 text-white";
                            }

                            return (
                              <button
                                key={opt}
                                onClick={() => setAnswers({ ...answers, [qItem.id]: opt })}
                                className={`py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${optStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={answers[qItem.id] || ""}
                            onChange={(e) => setAnswers({ ...answers, [qItem.id]: e.target.value })}
                            placeholder="Gõ đáp án..."
                            className="flex-1 px-3 py-2 rounded-xl bg-[#0C0E1D] border border-[#2B3060] focus:border-indigo-400 text-xs text-white outline-none"
                          />
                        </div>
                      )}

                      {submitted && (
                        <div
                          className={`text-xs font-bold pt-1 ${
                            isCorrect ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isCorrect ? "✓ Chính xác" : `✗ Đáp án chuẩn: ${qItem.answer}`}
                        </div>
                      )}

                      <div className="text-[11px] text-amber-300/80 flex items-center gap-1 pt-0.5">
                        <Sparkles size={12} className="text-amber-400 shrink-0" />
                        <span>Gợi ý: {qItem.hint}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#2B3060]/70 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubmitted(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Chấm điểm & Giải thích
                </button>
                <button
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="p-2.5 rounded-xl bg-[#1B1F40] text-zinc-300 hover:text-white border border-[#2B3060]"
                  title="Làm lại"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Full Runner CTA */}
              <Link
                href={`/practice/reading/${passage.slug}`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#F6E85C] hover:bg-[#F6E85C]/90 text-[#0C0E1D] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span>Vào phòng thi đầy đủ (Full Runner)</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
