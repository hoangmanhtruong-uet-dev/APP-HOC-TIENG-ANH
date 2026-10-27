"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mic,
  Activity,
  Radio,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Flame,
  Award,
  ChevronDown,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Volume2,
} from "lucide-react";

import "./speaking.css";
import { ThreeVocalVisualizer } from "./components/ThreeVocalVisualizer";
import { LiveSpeakingLab } from "./components/LiveSpeakingLab";
import { QuickSpeakingModal } from "./components/QuickSpeakingModal";
import {
  CURATED_SPEAKING_CUE_CARDS,
  SPEAKING_BAND_STAGES,
  type SpeakingCueCard,
} from "./components/speaking-curated-data";
import type { SpeakingCatalogItem } from "@/features/speaking/server/content";

interface SpeakingHubClientProps {
  items: SpeakingCatalogItem[];
  attemptsCount?: number;
  latestFeedback?: {
    pronunciationBand?: number;
    fluencyBand?: number;
    lexicalBand?: number;
    grammarBand?: number;
  } | null;
  profile?: {
    current_band?: number | null;
    target_band?: number | null;
    daily_study_minutes?: number | null;
    target_exam_date?: string | null;
  } | null;
}

export function SpeakingHubClient({
  items,
  attemptsCount = 14,
  latestFeedback,
  profile,
}: SpeakingHubClientProps) {
  const [selectedBand, setSelectedBand] = useState<string>("all");
  const [selectedPart, setSelectedPart] = useState<number>(0); // 0 = all
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMicTesting, setIsMicTesting] = useState<boolean>(false);
  const [micAudioLevel, setMicAudioLevel] = useState<number>(65);

  // Quick speaking modal state
  const [activeModalCard, setActiveModalCard] = useState<SpeakingCueCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Band descriptor computed
  const currentStage = useMemo(() => {
    if (selectedBand === "all") return SPEAKING_BAND_STAGES[2]; // 7.0-7.5 default
    return SPEAKING_BAND_STAGES.find((s) => s.band === selectedBand) || SPEAKING_BAND_STAGES[2];
  }, [selectedBand]);

  // Combined cue cards list
  const filteredCards = useMemo(() => {
    return CURATED_SPEAKING_CUE_CARDS.filter((card) => {
      // Part filter
      if (selectedPart !== 0 && card.part !== selectedPart) return false;

      // Band filter
      if (selectedBand !== "all") {
        const [lowStr, highStr] = selectedBand.split(" - ");
        const low = parseFloat(lowStr);
        const high = parseFloat(highStr);
        if (card.targetBand < low || card.targetBand > high) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = card.title.toLowerCase().includes(q);
        const matchesTopic = card.topic.toLowerCase().includes(q);
        const matchesPrompt = card.prompt.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTopic && !matchesPrompt) return false;
      }

      return true;
    });
  }, [selectedPart, selectedBand, searchQuery]);

  const handleOpenModal = (card: SpeakingCueCard) => {
    setActiveModalCard(card);
    setIsModalOpen(true);
  };

  const handleToggleMicTest = () => {
    setIsMicTesting(!isMicTesting);
    if (!isMicTesting) {
      setMicAudioLevel(Math.floor(60 + Math.random() * 35));
    }
  };

  // Scores
  const pronunBand = latestFeedback?.pronunciationBand ?? 7.0;
  const fluencyBand = latestFeedback?.fluencyBand ?? 7.5;
  const lexicalBand = latestFeedback?.lexicalBand ?? 7.5;
  const grammarBand = latestFeedback?.grammarBand ?? 7.0;

  return (
    <div className="space-y-8 pb-16 font-sans text-[#EEF0FF]">
      {/* 1. Cybernetic Holographic Vocal Matrix Header */}
      <section className="relative overflow-hidden rounded-3xl border border-[#242A4E] bg-gradient-to-br from-[#0C0E1D] via-[#12162B] to-[#1A1F3F] p-6 sm:p-10 shadow-2xl">
        {/* Glow ambient background lights */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-[#5B5FEF]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-[#00F0FF]/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Title, Descriptor & Assessment Criteria Badges */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5B5FEF]/20 px-3 py-1 text-xs font-mono font-bold text-[#7A7DF5] border border-[#5B5FEF]/30 uppercase tracking-wider">
                <Sparkles size={13} className="text-[#00F0FF]" /> IELTS Speaking Arena v3.2
              </span>

              {/* Band stage dropdown selector */}
              <div className="relative inline-block">
                <select
                  value={selectedBand}
                  onChange={(e) => setSelectedBand(e.target.value)}
                  className="appearance-none rounded-full bg-[#0C0E1D] border border-[#2E3660] px-3.5 py-1 pr-8 text-xs font-bold text-[#00F0FF] focus:outline-none focus:border-[#5B5FEF] cursor-pointer"
                  aria-label="Chọn giai đoạn band điểm Speaking"
                >
                  <option value="all">Tất cả Band điểm</option>
                  {SPEAKING_BAND_STAGES.map((s) => (
                    <option key={s.band} value={s.band}>
                      Band {s.band} — {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                />
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                AI Speaking Studio & Acoustic Resonance
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-2xl">
                Phản xạ nói tự nhiên, bóc tách lỗi âm vị ngữ âm IPA, kiểm soát từ đệm và làm chủ 2 phút Part 2 với phòng thu âm tương tác chuẩn Cambridge.
              </p>
            </div>

            {/* Assessment Criteria Matrix HUD (4 IELTS Criteria) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Fluency</span>
                  <span className="text-xs font-bold text-[#00F0FF] font-mono">{fluencyBand.toFixed(1)}</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00F0FF] rounded-full"
                    style={{ width: `${(fluencyBand / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Lexical</span>
                  <span className="text-xs font-bold text-[#7A7DF5] font-mono">{lexicalBand.toFixed(1)}</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B5FEF] rounded-full"
                    style={{ width: `${(lexicalBand / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Grammar</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">{grammarBand.toFixed(1)}</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${(grammarBand / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Pronun</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{pronunBand.toFixed(1)}</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${(pronunBand / 9) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Target band guidance card */}
            <div className="rounded-xl border border-[#1E2442] bg-[#0C0E1D]/50 p-3 text-xs text-[#94A3B8] flex items-center justify-between">
              <div>
                <strong className="text-[#EEF0FF]">{currentStage.name} Focus: </strong>
                <span>{currentStage.fluencyDescriptor}</span>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#5B5FEF]/20 text-[#7A7DF5]">
                {currentStage.band}
              </span>
            </div>
          </div>

          {/* Right Column: 3D Holographic Visualizer & Microphone Hardware Pre-Check */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
            <ThreeVocalVisualizer isRecording={isMicTesting} />

            {/* Microphone Pre-check Widget */}
            <div className="w-full max-w-[340px] rounded-2xl border border-[#242A4E] bg-[#0C0E1D]/90 p-3.5 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleMicTest}
                  className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                    isMicTesting
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                      : "bg-[#5B5FEF]/20 text-[#00F0FF] border border-[#5B5FEF]/30 hover:bg-[#5B5FEF]/30"
                  }`}
                  aria-label="Kiểm tra tín hiệu micro"
                >
                  <Mic size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        isMicTesting ? "bg-rose-400 animate-ping" : "bg-emerald-400"
                      }`}
                    />
                    <p className="text-xs font-bold text-white">
                      {isMicTesting ? "Live Audio Testing..." : "Microphone: Ready"}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] font-mono">
                    {isMicTesting ? `Gain: ${micAudioLevel}%` : "48kHz Stereo / Echo Cancel"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleMicTest}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1E2442] hover:bg-[#2A335E] text-[#EEF0FF] transition-colors"
              >
                {isMicTesting ? "Dừng test" : "Test mic"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Mini-Lab: IPA Phoneme Gym, 60s Prep, Filler Trap */}
      <LiveSpeakingLab />

      {/* 3. Bento Grid 4 Practice Modes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#5B5FEF]" />
            <h2 className="font-extrabold text-lg text-white">4 Chế Độ Luyện Nói Chuyên Sâu</h2>
          </div>
          <span className="text-xs text-[#94A3B8]">Chuẩn 3 Phần thi IELTS Speaking</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode 1: Part 1 Rapid Fire */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between speaking-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-[#5B5FEF]/20 text-[#7A7DF5] flex items-center justify-center mb-3">
                <Activity size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#7A7DF5] uppercase">PART 1 DRILL</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Part 1 Rapid Fire</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Rèn luyện phản xạ trả lời tức thì trong 15-20s cho các chủ đề đời sống thường nhật (Hometown, Study, Hobbies).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_SPEAKING_CUE_CARDS[2])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Luyện Part 1</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mode 2: Part 2 Cue Card Master */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between speaking-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center mb-3">
                <Mic size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#00F0FF] uppercase">PART 2 CORE</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Part 2 Cue Card Master</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Thử thách chuẩn 60 giây lập dàn ý và nói liên tục 2 phút không dừng với bộ đếm thời gian thông minh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_SPEAKING_CUE_CARDS[0])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Vào Cue Card</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mode 3: Part 3 Deep Discussion */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between speaking-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center mb-3">
                <Radio size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">PART 3 DEBATE</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Part 3 Abstract Discussion</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Rèn luận điểm trừu tượng, phân tích nguyên nhân - kết quả và phản biện đa chiều các vấn đề xã hội sâu sắc.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_SPEAKING_CUE_CARDS[1])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Vào Thảo luận</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mode 4: Shadowing & Rhythm Matrix */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between speaking-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Volume2 size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">INTONATION</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Shadowing & Rhythm</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Nghe và nhại ngữ điệu câu (intonation), nhịp thở (chunking) và nối âm (connected speech) cùng native speaker.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_SPEAKING_CUE_CARDS[3])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Luyện Rhythm</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Filterable Speaking Topics & Cue Cards Catalog */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-xl text-white">Kho Đề & Cue Cards Thực Chiến</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Tổng hợp {filteredCards.length} đề thi Speaking cập nhật với từ vựng C1/C2 và bài mẫu đạt Band 8.0+.
            </p>
          </div>

          {/* Filter Chips: All, Part 1, Part 2, Part 3 */}
          <div className="flex items-center gap-2">
            {[
              { id: 0, label: "Tất cả" },
              { id: 1, label: "Part 1" },
              { id: 2, label: "Part 2" },
              { id: 3, label: "Part 3" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPart(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedPart === p.id
                    ? "bg-[#5B5FEF] text-white shadow-sm"
                    : "bg-[#12162B] text-[#94A3B8] border border-[#242A4E] hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chủ đề speaking (Environment, Technology, Daily Routine, Culture...)"
            className="w-full rounded-2xl border border-[#242A4E] bg-[#12162B] py-3.5 pl-11 pr-4 text-xs text-[#EEF0FF] placeholder:text-[#64748B] focus:border-[#5B5FEF] focus:outline-none shadow-sm"
          />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 sm:p-6 flex flex-col justify-between speaking-glow-card"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#5B5FEF]/20 text-[#7A7DF5] border border-[#5B5FEF]/30">
                    IELTS PART {card.part}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-0.5 rounded border border-[#00F0FF]/20">
                      Band {card.targetBand.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                      <Clock size={12} /> {card.estimatedMinutes}m
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#A5B4FC] uppercase tracking-wide">
                    {card.topic}
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-0.5 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2">{card.prompt}</p>
                </div>

                {/* Vocabulary pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {card.vocabularyHighlights.map((v, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0C0E1D] text-[#EEF0FF] border border-[#1E2442]"
                    >
                      {v.word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-5 border-t border-[#1E2442] mt-4">
                <button
                  type="button"
                  onClick={() => handleOpenModal(card)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#5B5FEF] hover:bg-[#4D51DE] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#5B5FEF]/20"
                >
                  <Mic size={14} /> Vào phòng thu âm
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenModal(card)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1E2442] hover:bg-[#2A335E] text-[#EEF0FF] border border-[#242A4E] transition-all"
                >
                  Xem bài mẫu
                </button>
              </div>
            </div>
          ))}

          {filteredCards.length === 0 && (
            <div className="col-span-full rounded-2xl border border-[#242A4E] bg-[#12162B] p-10 text-center space-y-3">
              <Search size={32} className="mx-auto text-[#64748B]" />
              <p className="text-sm font-bold text-white">Không tìm thấy chủ đề phù hợp</p>
              <p className="text-xs text-[#94A3B8]">
                Thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Tất cả&quot; để xem toàn bộ danh mục.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedPart(0);
                  setSelectedBand("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5B5FEF] text-white"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 5. Supabase Dynamic Catalog Integration */}
      {items.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[#242A4E]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-lg text-white">Nhiệm Vụ Speaking Từ Giáo Trình Đã Lưu</h2>
              <p className="text-xs text-[#94A3B8]">Dữ liệu bài tập Speaking được gán cho tài khoản của bạn</p>
            </div>
            <span className="text-xs font-mono text-[#00F0FF]">{items.length} nhiệm vụ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.slug}
                className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between speaking-glow-card"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#5B5FEF]/20 text-[#7A7DF5]">
                      {item.difficulty.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#94A3B8]">{item.estimatedMinutes}m</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{item.title}</h4>
                  <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{item.description}</p>
                </div>

                <Link
                  href={`/practice/speaking/${item.slug}`}
                  className="mt-4 py-2 rounded-xl text-xs font-bold bg-[#1E2442] hover:bg-[#5B5FEF] text-center text-[#EEF0FF] hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Mở bài thực hành</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Speaking Studio Modal */}
      <QuickSpeakingModal
        card={activeModalCard}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
