"use client";

import React, { useState, useEffect } from "react";
import {
  Volume2,
  Mic,
  Timer,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import {
  IPA_PHONEME_PAIRS,
  FLUENCY_FILLER_FIXES,
  type IPAPhonemePair,
  type FluencyFillerFix,
} from "./speaking-curated-data";

export function LiveSpeakingLab() {
  const [activeTab, setActiveTab] = useState<"phoneme" | "prep60" | "fillers">("phoneme");

  // Tab 1: Phoneme state
  const [selectedPair, setSelectedPair] = useState<IPAPhonemePair>(IPA_PHONEME_PAIRS[0]);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // Tab 2: Prep 60s Timer state
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [prepNotes, setPrepNotes] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.9;
    setPlayingWord(text);
    utterance.onend = () => setPlayingWord(null);
    utterance.onerror = () => setPlayingWord(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(60);
  };

  return (
    <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242A4E] pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-[#00F0FF] animate-pulse" />
            <h3 className="font-extrabold text-base sm:text-lg text-[#EEF0FF] tracking-tight">
              Acoustic Reflex & Pronunciation Lab
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Micro-drills tập trung phản xạ phát âm chuẩn Cambridge, kiểm soát từ đệm và kỹ thuật nháp 60s Part 2.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex rounded-xl bg-[#0C0E1D] p-1 border border-[#1E2442] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("phoneme")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "phoneme"
                ? "bg-[#5B5FEF] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#EEF0FF]"
            }`}
          >
            IPA Gym
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prep60")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "prep60"
                ? "bg-[#5B5FEF] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#EEF0FF]"
            }`}
          >
            60s Prep Coach
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fillers")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "fillers"
                ? "bg-[#5B5FEF] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#EEF0FF]"
            }`}
          >
            Filler Trap
          </button>
        </div>
      </div>

      {/* Tab 1: IPA Phoneme Gym */}
      {activeTab === "phoneme" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {IPA_PHONEME_PAIRS.map((pair) => (
              <button
                key={pair.id}
                type="button"
                onClick={() => setSelectedPair(pair)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedPair.id === pair.id
                    ? "border-[#5B5FEF] bg-[#1E2442] shadow-sm"
                    : "border-[#1E2442] bg-[#0C0E1D]/60 hover:border-[#2E3660]"
                }`}
              >
                <p className="text-xs font-bold text-[#EEF0FF]">{pair.title}</p>
                <div className="flex items-center gap-2 mt-1 font-mono text-xs text-[#00F0FF]">
                  <span>{pair.soundA.symbol}</span>
                  <span className="text-[#94A3B8]">vs</span>
                  <span>{pair.soundB.symbol}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[#0C0E1D] border border-[#1E2442] p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Sound A */}
              <div className="p-4 rounded-xl border border-[#242A4E] bg-[#12162B] flex items-center justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#5B5FEF]/20 text-[#7A7DF5] border border-[#5B5FEF]/30">
                    {selectedPair.soundA.symbol}
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">{selectedPair.soundA.word}</h4>
                  <p className="text-xs font-mono text-[#94A3B8]">{selectedPair.soundA.ipa}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeak(selectedPair.soundA.word)}
                  aria-label={`Nghe mẫu ${selectedPair.soundA.word}`}
                  className="size-10 rounded-xl bg-[#5B5FEF]/20 hover:bg-[#5B5FEF] text-[#7A7DF5] hover:text-white border border-[#5B5FEF]/40 flex items-center justify-center transition-all"
                >
                  <Volume2 size={18} className={playingWord === selectedPair.soundA.word ? "animate-bounce" : ""} />
                </button>
              </div>

              {/* Sound B */}
              <div className="p-4 rounded-xl border border-[#242A4E] bg-[#12162B] flex items-center justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                    {selectedPair.soundB.symbol}
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">{selectedPair.soundB.word}</h4>
                  <p className="text-xs font-mono text-[#94A3B8]">{selectedPair.soundB.ipa}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeak(selectedPair.soundB.word)}
                  aria-label={`Nghe mẫu ${selectedPair.soundB.word}`}
                  className="size-10 rounded-xl bg-[#00F0FF]/20 hover:bg-[#00F0FF] text-[#00F0FF] hover:text-[#0C0E1D] border border-[#00F0FF]/40 flex items-center justify-center transition-all font-bold"
                >
                  <Volume2 size={18} className={playingWord === selectedPair.soundB.word ? "animate-bounce" : ""} />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#94A3B8] border-t border-[#1E2442] pt-3">
              <p>
                <strong className="text-rose-400 font-bold">⚠️ Bẫy trừ điểm: </strong>
                {selectedPair.trapExplanation}
              </p>
              <p>
                <strong className="text-emerald-400 font-bold">💡 Mẹo chuẩn bản xứ: </strong>
                {selectedPair.nativeTip}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 60s Prep Coach */}
      {activeTab === "prep60" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#0C0E1D] border border-[#1E2442] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`size-14 rounded-2xl flex items-center justify-center font-mono font-black text-xl border ${
                    timeLeft <= 10
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse"
                      : "bg-[#5B5FEF]/20 text-[#00F0FF] border-[#5B5FEF]/40"
                  }`}
                >
                  {timeLeft}s
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#EEF0FF]">IELTS Part 2 1-Minute Prep Countdown</h4>
                  <p className="text-xs text-[#94A3B8]">
                    {timerRunning
                      ? "Đồng hồ đang chạy — Ghi nhanh 4 từ khóa cốt lõi (Who / When / What / Feeling)!"
                      : "Nhấn Start để kích hoạt thử thách 60 giây lập dàn ý không nhìn tài liệu."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    timerRunning
                      ? "bg-amber-500 text-slate-900 hover:bg-amber-400 font-black"
                      : "bg-[#5B5FEF] text-white hover:bg-[#4D51DE]"
                  }`}
                >
                  {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                  {timerRunning ? "Tạm dừng" : "Bắt đầu 60s"}
                </button>
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="p-2 rounded-xl bg-[#1E2442] text-[#94A3B8] hover:text-white transition-colors"
                  aria-label="Đặt lại thời gian"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Quick Keyword Scratchpad */}
            <div>
              <label htmlFor="prep-scratchpad" className="block text-xs font-bold text-[#A5B4FC] mb-1.5">
                Bảng nháp từ khóa tốc ký (Mindmap Keywords Scratchpad):
              </label>
              <textarea
                id="prep-scratchpad"
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
                placeholder="Ví dụ: - Eco-habit: reusable cup&#10;- When: college sophomore year&#10;- Obstacle: forgetting at home&#10;- Impact: zero-waste lifestyle..."
                className="w-full h-24 rounded-xl bg-[#12162B] border border-[#242A4E] p-3 text-xs text-[#EEF0FF] placeholder:text-[#64748B] focus:border-[#5B5FEF] focus:outline-none resize-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fluency & Filler Trap */}
      {activeTab === "fillers" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FLUENCY_FILLER_FIXES.map((fix) => (
              <div
                key={fix.id}
                className="rounded-xl border border-[#242A4E] bg-[#0C0E1D] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {fix.category} Trap
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">BAND 7.5+ UPGRADE</span>
                  </div>
                  <h4 className="text-xs font-mono font-bold text-rose-400 line-through mb-2">
                    {fix.badFiller}
                  </h4>
                  <div className="space-y-1.5">
                    {fix.academicAlternatives.map((alt, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-[#EEF0FF]">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-medium">{alt}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-[#94A3B8] border-t border-[#1E2442] pt-2">
                  {fix.bandBoostTip}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
