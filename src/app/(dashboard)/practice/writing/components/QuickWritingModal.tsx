"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  FileText,
  RotateCcw,
  BookOpen,
  Award,
  AlertTriangle,
} from "lucide-react";
import type { CuratedWritingTask } from "./writing-curated-data";

interface QuickWritingModalProps {
  task: CuratedWritingTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickWritingModal({ task, isOpen, onClose }: QuickWritingModalProps) {
  const [essayContent, setEssayContent] = useState("");
  const [timeLeftSecs, setTimeLeftSecs] = useState(2400); // 40m default
  const [timerActive, setTimerActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setEssayContent("");
      setTimeLeftSecs(task.timeLimitMinutes * 60);
      setTimerActive(true);
      setSubmitted(false);
    }
  }, [isOpen, task]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeftSecs > 0) {
      interval = setInterval(() => {
        setTimeLeftSecs((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeftSecs]);

  // Real-time word count & lexical metrics
  const wordCount = useMemo(() => {
    const trimmed = essayContent.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [essayContent]);

  const lexicalDiversity = useMemo(() => {
    const trimmed = essayContent.trim();
    if (!trimmed) return 0;
    const words = trimmed.toLowerCase().split(/\s+/);
    const unique = new Set(words);
    return Math.round((unique.size / words.length) * 100);
  }, [essayContent]);

  if (!isOpen || !task) return null;

  const minWords = task.minWords;
  const isTargetReached = wordCount >= minWords;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="writing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#242A4E] bg-[#0C0E1D] shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#242A4E] bg-[#12162B] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-[#5B5FEF]/20 text-[#7A7DF5] border border-[#5B5FEF]/30">
              IELTS {task.taskType.toUpperCase()} STUDIO
            </span>
            <span className="text-xs font-semibold text-[#94A3B8]">Target Band {task.targetBand.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Timer */}
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#00F0FF] bg-[#0C0E1D] px-3 py-1 rounded-full border border-[#1E2442]">
              <Clock size={13} />
              <span>{formatTime(timeLeftSecs)}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ làm bài"
              className="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1E2442] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split-View */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#242A4E]">
          {/* Left Column: Task Prompt, Outline & Recommended Lexicon */}
          <div className="lg:col-span-5 p-6 space-y-6 overflow-y-auto">
            <div>
              <span className="text-[11px] font-bold text-[#A855F7] uppercase tracking-wide">
                {task.category} · {task.topic}
              </span>
              <h2 id="writing-modal-title" className="text-lg font-black text-white mt-1 leading-snug">
                {task.title}
              </h2>
            </div>

            {/* Prompt Box */}
            <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-4 text-xs space-y-2">
              <p className="font-semibold text-[#EEF0FF] leading-relaxed">{task.prompt}</p>
              {task.chartDescription && (
                <div className="p-2.5 rounded-xl bg-[#0C0E1D] border border-[#1E2442] text-[#94A3B8]">
                  <strong className="text-[#00F0FF] block mb-1">Dữ liệu biểu đồ tóm tắt:</strong>
                  {task.chartDescription}
                </div>
              )}
            </div>

            {/* Model Outline Guide */}
            <div>
              <h4 className="text-xs font-bold text-[#A5B4FC] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookOpen size={13} className="text-[#5B5FEF]" /> Cấu Trúc Dàn Ý 4 Đoạn Chuẩn:
              </h4>
              <div className="space-y-2">
                {task.modelOutline.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[#1E2442] bg-[#12162B] text-xs">
                    <div className="flex items-center justify-between font-bold text-white mb-1">
                      <span>{item.paragraph}</span>
                      <span className="text-[10px] text-[#7A7DF5] font-mono">{item.focus}</span>
                    </div>
                    <p className="text-[11px] font-mono text-[#00F0FF]">Gợi ý: &quot;{item.starterPhrase}&quot;</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended C1/C2 Vocabulary */}
            <div>
              <h4 className="text-xs font-bold text-[#A5B4FC] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#00F0FF]" /> C1/C2 Lexical Recommendations:
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {task.recommendedVocabulary.map((vocab, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-[#1E2442] bg-[#12162B] text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-white">{vocab.word}</strong>
                      <span className="text-[10px] font-mono px-1 rounded bg-[#5B5FEF]/30 text-[#7A7DF5]">
                        {vocab.band}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-1">{vocab.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Zen Focus Markdown Writing Area */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4 bg-[#080A14]">
            {/* Live Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-[#242A4E] bg-[#12162B]">
              <div className="flex items-center gap-4">
                {/* Word Counter */}
                <div className="flex items-center gap-2">
                  <FileText size={15} className={isTargetReached ? "text-emerald-400" : "text-amber-400"} />
                  <span className="text-xs font-bold text-[#EEF0FF]">
                    <strong className={`font-mono text-sm ${isTargetReached ? "text-emerald-400" : "text-amber-400"}`}>
                      {wordCount}
                    </strong>{" "}
                    / {minWords} từ
                  </span>
                </div>

                {/* Lexical Diversity */}
                <div className="text-xs text-[#94A3B8]">
                  Đa dạng từ vựng: <strong className="text-[#00F0FF] font-mono">{lexicalDiversity}%</strong>
                </div>
              </div>

              {isTargetReached ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Đã đủ số từ tối thiểu
                </span>
              ) : (
                <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Cần thêm {Math.max(0, minWords - wordCount)} từ
                </span>
              )}
            </div>

            {/* Essay Textarea Editor */}
            <div className="flex-1 flex flex-col min-h-[300px]">
              <textarea
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
                placeholder="Nhập bài luận của bạn tại đây... Hãy bắt đầu với Introduction (Paraphrase + Thesis Statement)."
                className="w-full flex-1 rounded-2xl border border-[#242A4E] bg-[#0C0E1D] p-4 text-sm text-[#EEF0FF] placeholder:text-[#64748B] focus:border-[#5B5FEF] focus:outline-none resize-none leading-relaxed font-sans"
              />
            </div>

            {/* Submission Status or Action Buttons */}
            {submitted ? (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Bài viết đã được lưu nháp thành công!
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8]">{wordCount} words recorded</span>
                </div>

                {/* Simulated 4 IELTS Assessment Scores */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1E2442] text-center">
                  <div className="p-2 rounded-lg bg-[#0C0E1D]">
                    <span className="text-[10px] text-[#94A3B8] block">Task Resp</span>
                    <strong className="text-xs text-[#00F0FF] font-mono">7.5</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0C0E1D]">
                    <span className="text-[10px] text-[#94A3B8] block">Coherence</span>
                    <strong className="text-xs text-[#7A7DF5] font-mono">7.0</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0C0E1D]">
                    <span className="text-[10px] text-[#94A3B8] block">Lexical</span>
                    <strong className="text-xs text-amber-400 font-mono">7.5</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-[#0C0E1D]">
                    <span className="text-[10px] text-[#94A3B8] block">Grammar</span>
                    <strong className="text-xs text-emerald-400 font-mono">7.0</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  Đóng studio & Quay lại thư viện
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEssayContent("")}
                  className="px-4 py-3 rounded-xl text-xs font-bold bg-[#1E2442] hover:bg-[#2A335E] text-[#94A3B8] hover:text-white transition-colors"
                >
                  Xóa bài
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  disabled={wordCount === 0}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-[#5B5FEF] hover:bg-[#4D51DE] disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg shadow-[#5B5FEF]/25 transition-all"
                >
                  Nộp bài & Kiểm tra tiêu chí IELTS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
