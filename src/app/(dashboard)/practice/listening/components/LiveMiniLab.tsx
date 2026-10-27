"use client";

import { useState, useMemo } from "react";
import {
  Zap,
  Mic,
  Sparkles,
  BarChart3,
  Volume2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

import {
  DICTATION_SENTENCES,
  PARAPHRASE_PAIRS,
  DIAGNOSTIC_SKILLS,
  type DictationSentence,
  type ParaphrasePair
} from "./listening-curated-data";

export interface LiveMiniLabProps {
  playbackSpeed: number;
  onSpeak: (text: string, lang?: string, rate?: number) => void;
}

export function LiveMiniLab({ playbackSpeed, onSpeak }: LiveMiniLabProps) {
  const [activeTab, setActiveTab] = useState<"dictation" | "paraphrase" | "diagnostic">("dictation");
  const [dictationIdx, setDictationIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedParaphraseId, setSelectedParaphraseId] = useState("p1");

  const currentDictation: DictationSentence = DICTATION_SENTENCES[dictationIdx] ?? DICTATION_SENTENCES[0];

  // Real-time word diff calculation for IELTS
  const dictationWordDiff = useMemo(() => {
    const targetWords = currentDictation.text.split(" ");
    const typedWords = userInput.trim().split(/\s+/).filter(Boolean);

    return targetWords.map((tWord, index) => {
      const cleanTarget = tWord.replace(/[.,?!;:"]/g, "").toLowerCase();
      const typed = typedWords[index] ? typedWords[index].replace(/[.,?!;:"]/g, "").toLowerCase() : "";

      if (!typed) return { word: tWord, status: "pending" as const };
      if (typed === cleanTarget) return { word: tWord, status: "correct" as const };

      // Check for missing -s or -ed endings (most common IELTS trap)
      if (
        cleanTarget.startsWith(typed) &&
        (cleanTarget.endsWith("s") || cleanTarget.endsWith("ed") || cleanTarget.endsWith("es"))
      ) {
        return { word: tWord, status: "ending-missed" as const, typed };
      }

      return { word: tWord, status: "wrong" as const, typed };
    });
  }, [currentDictation, userInput]);

  const activePair: ParaphrasePair =
    PARAPHRASE_PAIRS.find((item) => item.id === selectedParaphraseId) ?? PARAPHRASE_PAIRS[0];

  return (
    <section
      id="live-mini-lab"
      className="rounded-3xl bg-gradient-to-b from-[#141731] via-[#10132B] to-[#0C0E1D] border border-indigo-500/25 p-5 sm:p-7 shadow-xl relative overflow-hidden"
    >
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#2B3060]/70 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Trạm Phản Xạ Âm Thanh Tức Thì (Live Mini-Lab)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Tương tác trực tiếp
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Khởi động tai nghe trong 30 giây: bắt lỗi âm đuôi (-s/-ed) theo thời gian thực & giải mã bẫy Paraphrase
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#0C0E1D] p-1.5 rounded-2xl border border-[#2B3060] self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab("dictation")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "dictation"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Mic size={14} />
            <span>Chép Chính Tả 1 Câu</span>
          </button>
          <button
            onClick={() => setActiveTab("paraphrase")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "paraphrase"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Sparkles size={14} />
            <span>Bẫy Paraphrase</span>
          </button>
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "diagnostic"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <BarChart3 size={14} />
            <span>Radar Kỹ Năng</span>
          </button>
        </div>
      </div>

      {/* TAB 1: QUICK DICTATION */}
      {activeTab === "dictation" && (
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                  Câu #{dictationIdx + 1}/{DICTATION_SENTENCES.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#1B1F40] text-zinc-300 text-xs font-medium border border-[#2B3060]">
                  {currentDictation.accent}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                  {currentDictation.band}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSpeak(currentDictation.text, currentDictation.lang, playbackSpeed)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe câu mẫu ({playbackSpeed}x)</span>
                </button>
                <button
                  onClick={() => {
                    setDictationIdx((prev) => (prev + 1) % DICTATION_SENTENCES.length);
                    setUserInput("");
                    setShowAnswer(false);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1B1F40] hover:bg-[#252A56] text-zinc-200 text-xs font-semibold border border-[#2B3060] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đổi câu</span>
                </button>
              </div>
            </div>

            {/* Input area */}
            <div className="relative">
              <textarea
                rows={2}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Bấm 'Nghe câu mẫu' rồi gõ lại chính xác từng từ bạn nghe được vào đây (chú ý âm đuôi -s, -ed)..."
                className="w-full rounded-2xl bg-[#0C0E1D] border border-indigo-500/30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 p-4 text-sm text-white placeholder-zinc-500 outline-none transition resize-none leading-relaxed"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                <span className="text-[11px] sm:text-xs">
                  💡 Mẹo: Hệ thống tự động bắt lỗi thiếu âm đuôi (-s, -ed) theo thời gian thực.
                </span>
                <button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors ml-2 shrink-0"
                >
                  {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAnswer ? "Ẩn đáp án" : "Hiện đáp án chuẩn"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Diff Box */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0C0E1D]/90 border border-[#2B3060] p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                So khớp Diff Ký Tự Tức Thì
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-400 font-medium">● Đúng</span>
                <span className="text-amber-400 font-medium">● Thiếu -s/-ed</span>
                <span className="text-rose-400 font-medium">● Sai</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141731]/70 border border-[#2B3060]/60 flex flex-wrap gap-1.5 min-h-[72px] items-center">
              {dictationWordDiff.map((item, idx) => {
                if (item.status === "correct") {
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                    >
                      {item.word}
                    </span>
                  );
                }
                if (item.status === "ending-missed") {
                  return (
                    <span
                      key={idx}
                      title="Bạn gõ thiếu âm đuôi -s hoặc -ed!"
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold animate-pulse"
                    >
                      {item.typed}
                      <u className="text-amber-200 font-black ml-0.5">[-s/-ed?]</u>
                    </span>
                  );
                }
                if (item.status === "wrong") {
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs line-through"
                    >
                      {item.typed}
                    </span>
                  );
                }
                return (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white/[0.04] text-zinc-500 text-xs font-mono"
                  >
                    {showAnswer ? (
                      <span className="text-indigo-300">{item.word}</span>
                    ) : (
                      "•".repeat(Math.min(item.word.length, 7))
                    )}
                  </span>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-400 mr-1">Bẫy âm thanh trong câu:</span>
              {currentDictation.traps.map((trap, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium"
                >
                  {trap}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARAPHRASE TRAPS */}
      {activeTab === "paraphrase" && (
        <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PARAPHRASE_PAIRS.map((p) => {
              const isSelected = selectedParaphraseId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedParaphraseId(p.id);
                    onSpeak(p.audio, "en-GB", 1.0);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-400 shadow-lg shadow-indigo-600/20"
                      : "bg-[#0C0E1D]/80 border-[#2B3060] hover:border-zinc-500"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold mb-1">
                    <span>🎧 TRONG BĂNG NGHE</span>
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-sm font-bold text-white tracking-tight">"{p.audio}"</div>
                  <div className="mt-2 pt-2 border-t border-[#2B3060]/60 text-xs text-emerald-300 font-medium">
                    📝 Đề bài: "{p.question}"
                  </div>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-5 p-5 rounded-2xl bg-[#0C0E1D] border border-indigo-500/30 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>GIẢI MÃ BẪY PARAPHRASE CAMBRIDGE</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">{activePair.explanation}</p>
            <div className="p-3 rounded-xl bg-[#141731] border border-[#2B3060] text-xs text-zinc-400">
              Hơn <strong className="text-white">75% câu hỏi Section 3 & 4</strong> không lặp lại từ nguyên gốc trong băng mà dùng cấu trúc tương đương ngữ nghĩa như trên.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSTIC SKILLS RADAR */}
      {activeTab === "diagnostic" && (
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {DIAGNOSTIC_SKILLS.map((s, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#0C0E1D] border border-[#2B3060] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">{s.status}</span>
                <span className="font-extrabold text-white text-base">{s.score}%</span>
              </div>
              <div className="text-sm font-bold text-zinc-100">{s.label}</div>
              <div className="h-2 w-full bg-[#1B1F40] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${s.color} rounded-full transition-all duration-700`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
