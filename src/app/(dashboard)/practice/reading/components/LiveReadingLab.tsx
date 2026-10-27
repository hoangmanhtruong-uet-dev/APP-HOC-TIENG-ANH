"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Target,
  Gauge,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  BookOpenCheck,
  Timer
} from "lucide-react";

import {
  TRUE_FALSE_TRAPS,
  SPEED_READING_TEXTS,
  MATCHING_HEADING_TRAPS,
  type TrueFalseTrap,
  type SpeedReadingText,
  type MatchingHeadingTrap
} from "./reading-curated-data";

export interface LiveReadingLabProps {
  onWpmUpdate?: (wpm: number) => void;
}

export function LiveReadingLab({ onWpmUpdate }: LiveReadingLabProps) {
  const [activeTab, setActiveTab] = useState<"tfng" | "speed" | "headings">("tfng");

  // Tab 1: TFNG State
  const [tfngIdx, setTfngIdx] = useState(0);
  const [selectedTfngAnswer, setSelectedTfngAnswer] = useState<"TRUE" | "FALSE" | "NOT GIVEN" | null>(null);

  // Tab 2: Speed WPM State
  const [speedIdx, setSpeedIdx] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [calculatedWpm, setCalculatedWpm] = useState<number | null>(null);
  const [selectedComprehensionAns, setSelectedComprehensionAns] = useState<string | null>(null);

  // Tab 3: Matching Headings State
  const [headingIdx, setHeadingIdx] = useState(0);
  const [selectedHeadingOptionId, setSelectedHeadingOptionId] = useState<string | null>(null);

  const currentTfng: TrueFalseTrap = TRUE_FALSE_TRAPS[tfngIdx] ?? TRUE_FALSE_TRAPS[0];
  const currentSpeedText: SpeedReadingText = SPEED_READING_TEXTS[speedIdx] ?? SPEED_READING_TEXTS[0];
  const currentHeading: MatchingHeadingTrap = MATCHING_HEADING_TRAPS[headingIdx] ?? MATCHING_HEADING_TRAPS[0];

  // Timer for Speed Reading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReading]);

  const handleStartReading = () => {
    setIsReading(true);
    setElapsedSeconds(0);
    setCalculatedWpm(null);
    setSelectedComprehensionAns(null);
  };

  const handleFinishReading = () => {
    setIsReading(false);
    const secs = Math.max(1, elapsedSeconds);
    const wpm = Math.round((currentSpeedText.wordCount / secs) * 60);
    setCalculatedWpm(wpm);
    if (onWpmUpdate) onWpmUpdate(wpm);
  };

  return (
    <section
      id="live-reading-lab"
      className="rounded-3xl bg-gradient-to-b from-[#141731] via-[#10132B] to-[#0C0E1D] border border-indigo-500/25 p-5 sm:p-7 shadow-xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#2B3060]/70 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Trạm Phản Xạ Đọc Hiểu Tức Thì (Live Reading Mini-Lab)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Thực chiến 30s
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Giải mã bẫy True/False/Not Given, đo tốc độ đọc từ/phút (WPM) và phân tích câu chủ đề đoạn văn
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#0C0E1D] p-1.5 rounded-2xl border border-[#2B3060] self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab("tfng")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "tfng"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Target size={14} />
            <span>Bẫy True/False/NG</span>
          </button>
          <button
            onClick={() => setActiveTab("speed")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "speed"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Gauge size={14} />
            <span>Speed WPM Meter</span>
          </button>
          <button
            onClick={() => setActiveTab("headings")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "headings"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <BookOpenCheck size={14} />
            <span>Matching Headings</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TRUE / FALSE / NOT GIVEN DETECTIVE */}
      {activeTab === "tfng" && (
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                Câu #{tfngIdx + 1}/{TRUE_FALSE_TRAPS.length} • Bẫy: {currentTfng.trapType}
              </span>

              <button
                onClick={() => {
                  setTfngIdx((prev) => (prev + 1) % TRUE_FALSE_TRAPS.length);
                  setSelectedTfngAnswer(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1B1F40] hover:bg-[#252A56] text-zinc-200 text-xs font-semibold border border-[#2B3060] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đổi câu bẫy</span>
              </button>
            </div>

            {/* Passage Quote */}
            <div className="p-4 rounded-2xl bg-[#0C0E1D] border border-indigo-500/30 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#F6E85C]" />
                Đoạn trích từ bài đọc:
              </div>
              <p className="text-sm text-zinc-200 italic leading-relaxed">
                "{currentTfng.passageSnippet}"
              </p>
            </div>

            {/* Statement to verify */}
            <div className="p-4 rounded-2xl bg-[#141731] border border-[#2B3060] space-y-3">
              <div className="text-xs font-bold text-amber-300">
                Khẳng định trong đề bài:
              </div>
              <div className="text-sm font-semibold text-white leading-relaxed">
                "{currentTfng.statement}"
              </div>

              {/* 3 Answer Choices */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {(["TRUE", "FALSE", "NOT GIVEN"] as const).map((choice) => {
                  const isSelected = selectedTfngAnswer === choice;
                  const isCorrect = choice === currentTfng.answer;

                  let btnStyle = "bg-[#0C0E1D] border-[#2B3060] text-zinc-300 hover:text-white hover:border-indigo-400";
                  if (selectedTfngAnswer) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20";
                    } else if (isSelected) {
                      btnStyle = "bg-rose-500/20 border-rose-400 text-rose-300";
                    }
                  }

                  return (
                    <button
                      key={choice}
                      onClick={() => setSelectedTfngAnswer(choice)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold tracking-wider transition-all ${btnStyle}`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logic Explanation Box */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0C0E1D]/90 border border-[#2B3060] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <HelpCircle size={15} className="text-indigo-400" />
              <span>Giải mã bẫy logic Cambridge</span>
            </div>

            {selectedTfngAnswer ? (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  {selectedTfngAnswer === currentTfng.answer ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Chính xác! Đáp án là {currentTfng.answer}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                      <XCircle size={18} />
                      <span>Chưa đúng! Đáp án chuẩn là {currentTfng.answer}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed bg-[#141731] p-3.5 rounded-xl border border-[#2B3060]">
                  {currentTfng.explanation}
                </p>

                <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
                  💡 <strong>Quy tắc vàng:</strong> False nghĩa là thông tin đối lập trực tiếp. Not Given nghĩa là bài đọc có thể nhắc từ khóa nhưng không khẳng định mối quan hệ đề bài nêu.
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 text-center py-8">
                Bấm chọn một trong 3 phương án <strong>TRUE, FALSE</strong> hoặc <strong>NOT GIVEN</strong> để xem phân tích bẫy chi tiết.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SPEED READING WPM METER */}
      {activeTab === "speed" && (
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  {currentSpeedText.title}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {currentSpeedText.wordCount} từ
                </span>
              </div>

              {!isReading && !calculatedWpm && (
                <button
                  onClick={handleStartReading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                  Bắt đầu bấm giờ đọc
                </button>
              )}

              {isReading && (
                <button
                  onClick={handleFinishReading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-md animate-pulse"
                >
                  Đã đọc xong ({elapsedSeconds}s)
                </button>
              )}

              {calculatedWpm && (
                <button
                  onClick={handleStartReading}
                  className="px-3 py-1.5 rounded-xl bg-[#1B1F40] text-zinc-200 text-xs font-semibold border border-[#2B3060]"
                >
                  Đo lại
                </button>
              )}
            </div>

            {/* Reading Box */}
            <div className="p-5 rounded-2xl bg-[#0C0E1D] border border-emerald-500/30 text-sm sm:text-base text-zinc-200 leading-relaxed font-serif relative">
              {currentSpeedText.text}
            </div>
          </div>

          {/* WPM Result & Comprehension Check */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0C0E1D]/90 border border-[#2B3060] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Chỉ số Tốc độ Đọc (WPM)
              </span>
              <Timer size={16} className="text-emerald-400" />
            </div>

            {calculatedWpm ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-xl bg-[#141731] border border-[#2B3060] flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black text-emerald-400">{calculatedWpm}</span>
                    <span className="text-xs text-zinc-400 ml-1.5 font-bold">WPM (Từ/Phút)</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      calculatedWpm >= 240
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {calculatedWpm >= 240 ? "Đạt chuẩn IELTS Academic" : "Cần tăng tốc độ"}
                  </span>
                </div>

                {/* Comprehension Check */}
                <div className="space-y-2 pt-2 border-t border-[#2B3060]/70">
                  <div className="text-xs font-bold text-indigo-300">
                    Kiểm tra độ hiểu (Comprehension Check):
                  </div>
                  <div className="text-xs text-white font-medium">
                    {currentSpeedText.checkQuestion.q}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {currentSpeedText.checkQuestion.options.map((opt) => {
                      const isCorrect = opt === currentSpeedText.checkQuestion.answer;
                      const isChosen = selectedComprehensionAns === opt;

                      let optStyle = "bg-[#141731] border-[#2B3060] text-zinc-300 hover:text-white";
                      if (selectedComprehensionAns) {
                        if (isCorrect) optStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300";
                        else if (isChosen) optStyle = "bg-rose-500/20 border-rose-400 text-rose-300";
                      }

                      return (
                        <button
                          key={opt}
                          onClick={() => setSelectedComprehensionAns(opt)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-colors ${optStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 text-center py-10">
                Bấm <strong>"Bắt đầu bấm giờ đọc"</strong>, đọc hết đoạn trích và bấm <strong>"Đã đọc xong"</strong> để xem tốc độ WPM thực tế của bạn.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MATCHING HEADINGS STRATEGIST */}
      {activeTab === "headings" && (
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                {currentHeading.paragraphLabel}
              </span>
              <span className="text-xs text-zinc-400">Chọn 1 tiêu đề tóm lược toàn bộ đoạn văn</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0C0E1D] border border-indigo-500/30 text-sm text-zinc-200 leading-relaxed font-serif">
              "{currentHeading.paragraphText}"
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-zinc-400">Các lựa chọn tiêu đề (Headings):</div>
              {currentHeading.options.map((opt) => {
                const isSelected = selectedHeadingOptionId === opt.id;
                let optStyle = "bg-[#141731] border-[#2B3060] text-zinc-300 hover:border-indigo-400 hover:text-white";
                if (selectedHeadingOptionId) {
                  if (opt.isCorrect) optStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300";
                  else if (isSelected) optStyle = "bg-rose-500/20 border-rose-400 text-rose-300";
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedHeadingOptionId(opt.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left text-xs font-semibold transition-all ${optStyle}`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Heading Explanation */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0C0E1D]/90 border border-[#2B3060] p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Phân tích Bẫy Tiêu Đề
            </div>

            {selectedHeadingOptionId ? (
              <div className="space-y-3 animate-fadeIn">
                {currentHeading.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      opt.isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "bg-[#141731] border-[#2B3060] text-zinc-400"
                    }`}
                  >
                    <div className="font-bold mb-1 text-white">
                      {opt.isCorrect ? "✓ Tiêu đề đúng" : "✗ Bẫy thường gặp"}:
                    </div>
                    {opt.reason}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 text-center py-8">
                Bấm vào một trong các tiêu đề bên trái để xem bóc tách chi tiết.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
