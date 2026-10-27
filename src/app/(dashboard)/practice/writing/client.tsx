"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  PenLine,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Flame,
  Award,
  ChevronDown,
  Layers,
  FileText,
  Clock,
  BookOpen,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Quote,
  Target,
} from "lucide-react";

import "./writing.css";
import { ThreeLexicalCore } from "./components/ThreeLexicalCore";
import { LiveWritingLab } from "./components/LiveWritingLab";
import { QuickWritingModal } from "./components/QuickWritingModal";
import {
  CURATED_WRITING_TASKS,
  WRITING_BAND_STAGES,
  type CuratedWritingTask,
} from "./components/writing-curated-data";
import type { WritingCatalogItem } from "@/features/writing/server/content";

interface WritingHubClientProps {
  items: WritingCatalogItem[];
  submissionsCount?: number;
  avgScore?: number;
  profile?: {
    current_band?: number | null;
    target_band?: number | null;
    daily_study_minutes?: number | null;
    target_exam_date?: string | null;
  } | null;
}

export function WritingHubClient({
  items,
  submissionsCount = 8,
  avgScore = 7.0,
  profile,
}: WritingHubClientProps) {
  const [selectedBand, setSelectedBand] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"all" | "task1" | "task2">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal state
  const [activeTaskModal, setActiveTaskModal] = useState<CuratedWritingTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Band descriptor computed
  const currentStage = useMemo(() => {
    if (selectedBand === "all") return WRITING_BAND_STAGES[2]; // 7.0-7.5 default
    return WRITING_BAND_STAGES.find((s) => s.band === selectedBand) || WRITING_BAND_STAGES[2];
  }, [selectedBand]);

  // Filtered curated tasks
  const filteredTasks = useMemo(() => {
    return CURATED_WRITING_TASKS.filter((task) => {
      // Type filter
      if (selectedType !== "all" && task.taskType !== selectedType) return false;

      // Band filter
      if (selectedBand !== "all") {
        const [lowStr, highStr] = selectedBand.split(" - ");
        const low = parseFloat(lowStr);
        const high = parseFloat(highStr);
        if (task.targetBand < low || task.targetBand > high) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesTopic = task.topic.toLowerCase().includes(q);
        const matchesPrompt = task.prompt.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTopic && !matchesPrompt) return false;
      }

      return true;
    });
  }, [selectedType, selectedBand, searchQuery]);

  const handleOpenModal = (task: CuratedWritingTask) => {
    setActiveTaskModal(task);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-16 font-sans text-[#EEF0FF]">
      {/* 1. Cybernetic Holographic Lexical Core Header */}
      <section className="relative overflow-hidden rounded-3xl border border-[#242A4E] bg-gradient-to-br from-[#0C0E1D] via-[#14122B] to-[#1F183D] p-6 sm:p-10 shadow-2xl">
        {/* Glow ambient background lights */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-[#A855F7]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-[#5B5FEF]/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Title, Descriptor & 4 Criteria HUD */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A855F7]/20 px-3 py-1 text-xs font-mono font-bold text-[#C084FC] border border-[#A855F7]/30 uppercase tracking-wider">
                <Sparkles size={13} className="text-[#00F0FF]" /> IELTS Writing Studio v3.2
              </span>

              {/* Band stage dropdown selector */}
              <div className="relative inline-block">
                <select
                  value={selectedBand}
                  onChange={(e) => setSelectedBand(e.target.value)}
                  className="appearance-none rounded-full bg-[#0C0E1D] border border-[#2E3660] px-3.5 py-1 pr-8 text-xs font-bold text-[#A855F7] focus:outline-none focus:border-[#5B5FEF] cursor-pointer"
                  aria-label="Chọn giai đoạn band điểm Writing"
                >
                  <option value="all">Tất cả Band điểm</option>
                  {WRITING_BAND_STAGES.map((s) => (
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
                Zen Focus Writing & Lexical Architecture
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-2xl">
                Làm chủ cấu trúc bài luận Academic Task 1 & Task 2, rèn luyện nghệ thuật liên kết ý Cohesion mượt mà và mở rộng vốn từ vựng học thuật C1/C2.
              </p>
            </div>

            {/* Assessment Criteria Matrix HUD (4 IELTS Writing Criteria) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Task Resp</span>
                  <span className="text-xs font-bold text-[#00F0FF] font-mono">7.5</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00F0FF] rounded-full" style={{ width: "83%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Coherence</span>
                  <span className="text-xs font-bold text-[#C084FC] font-mono">7.0</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A855F7] rounded-full" style={{ width: "78%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Lexical</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">7.5</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: "83%" }} />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#242A4E] bg-[#0C0E1D]/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">Grammar</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">7.0</span>
                </div>
                <div className="h-1.5 w-full bg-[#1E2442] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "78%" }} />
                </div>
              </div>
            </div>

            {/* Target band guidance card */}
            <div className="rounded-xl border border-[#1E2442] bg-[#0C0E1D]/50 p-3 text-xs text-[#94A3B8] flex items-center justify-between">
              <div>
                <strong className="text-[#EEF0FF]">{currentStage.name} Focus: </strong>
                <span>{currentStage.taskResponseTarget}</span>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#A855F7]/20 text-[#C084FC]">
                {currentStage.band}
              </span>
            </div>
          </div>

          {/* Right Column: 3D Holographic Lexical Crystal */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
            <ThreeLexicalCore isTyping={false} />

            {/* Writing Quick Stats Widget */}
            <div className="w-full max-w-[340px] rounded-2xl border border-[#242A4E] bg-[#0C0E1D]/90 p-4 backdrop-blur-md flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-[#94A3B8]">Essays Submitted</p>
                <p className="text-lg font-black text-white">{submissionsCount} bài viết</p>
              </div>
              <div className="w-px h-8 bg-[#1E2442]" />
              <div>
                <p className="text-[10px] font-mono uppercase text-[#94A3B8]">Target Band</p>
                <p className="text-lg font-black text-[#A855F7]">{avgScore.toFixed(1)} Band</p>
              </div>
              <div className="w-px h-8 bg-[#1E2442]" />
              <div>
                <p className="text-[10px] font-mono uppercase text-[#94A3B8]">Word Sprint</p>
                <p className="text-lg font-black text-emerald-400">2,450w</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Mini-Lab: Paraphrase Forge, Cohesion Matrix, Lexicon Swap */}
      <LiveWritingLab />

      {/* 3. Bento Grid 4 Practice Modes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#A855F7]" />
            <h2 className="font-extrabold text-lg text-white">4 Chế Độ Luyện Viết Chuyên Sâu</h2>
          </div>
          <span className="text-xs text-[#94A3B8]">Academic Task 1 & Task 2</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode 1: Task 1 Visual Data Synthesis */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between writing-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-[#5B5FEF]/20 text-[#7A7DF5] flex items-center justify-center mb-3">
                <BarChart3 size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#7A7DF5] uppercase">TASK 1 REPORT</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Visual Data Synthesis</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Rèn viết Overview 2 câu đắt giá, chọn lọc số liệu quan trọng và làm chủ các biểu đồ Line, Bar, Pie, Process.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_WRITING_TASKS[1])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Vào Task 1</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mode 2: Task 2 Argumentative Essay */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between writing-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-[#A855F7]/20 text-[#C084FC] flex items-center justify-center mb-3">
                <PenLine size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#C084FC] uppercase">TASK 2 ESSAY</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Argumentative Essay</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Xây dựng dàn ý 4 đoạn chặt chẽ, phát triển luận điểm với ví dụ thực tiễn cho Opinion, Discussion và Problem-Solution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_WRITING_TASKS[0])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Vào Task 2</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mode 3: Paraphrase Forge */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between writing-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <RefreshCw size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">SYNTAX FORGE</span>
              <h3 className="font-bold text-sm text-white mt-0.5">Paraphrase & Complex Sentences</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Biến câu đơn thành câu phức với mệnh đề quan hệ rút gọn, đảo ngữ và danh từ hóa (nominalization).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_WRITING_TASKS[2])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Luyện Syntax</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mode 4: 5-Minute Outline Sprint */}
          <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between writing-glow-card">
            <div>
              <div className="size-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center mb-3">
                <Clock size={20} />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">OUTLINE SPRINT</span>
              <h3 className="font-bold text-sm text-white mt-0.5">5-Minute Outline Sprint</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Thử thách giới hạn 5 phút bóc tách đề bài, lên Thesis Statement và 2 luận điểm thân bài không chần chừ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal(CURATED_WRITING_TASKS[0])}
              className="mt-4 flex items-center justify-between text-xs font-bold text-[#00F0FF] hover:underline"
            >
              <span>Vào Sprint</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Filterable Practice Tasks Library */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-xl text-white">Thư Viện Đề Thi Writing Chuẩn Format</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Tổng hợp {filteredTasks.length} đề thi IELTS Writing có kèm dàn ý mẫu 4 đoạn và từ vựng gợi ý C1/C2.
            </p>
          </div>

          {/* Filter Chips: All, Task 1, Task 2 */}
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "Tất cả đề" },
              { id: "task1", label: "Task 1 Report" },
              { id: "task2", label: "Task 2 Essay" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id as "all" | "task1" | "task2")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedType === t.id
                    ? "bg-[#5B5FEF] text-white shadow-sm"
                    : "bg-[#12162B] text-[#94A3B8] border border-[#242A4E] hover:text-white"
                }`}
              >
                {t.label}
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
            placeholder="Tìm kiếm chủ đề bài viết (Energy, Technology, Environment, Remote Work...)"
            className="w-full rounded-2xl border border-[#242A4E] bg-[#12162B] py-3.5 pl-11 pr-4 text-xs text-[#EEF0FF] placeholder:text-[#64748B] focus:border-[#5B5FEF] focus:outline-none shadow-sm"
          />
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 sm:p-6 flex flex-col justify-between writing-glow-card"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#A855F7]/20 text-[#C084FC] border border-[#A855F7]/30">
                    {task.taskType.toUpperCase()} · {task.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-0.5 rounded border border-[#00F0FF]/20">
                      Band {task.targetBand.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                      <Clock size={12} /> {task.timeLimitMinutes}m
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#A5B4FC] uppercase tracking-wide">
                    {task.topic}
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-0.5 leading-snug">
                    {task.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2">{task.prompt}</p>
                </div>

                {/* Vocabulary pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {task.recommendedVocabulary.map((v, i) => (
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
                  onClick={() => handleOpenModal(task)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#5B5FEF] hover:bg-[#4D51DE] text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#5B5FEF]/20"
                >
                  <PenLine size={14} /> Mở Zen Writing Studio
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenModal(task)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1E2442] hover:bg-[#2A335E] text-[#EEF0FF] border border-[#242A4E] transition-all"
                >
                  Xem dàn ý
                </button>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="col-span-full rounded-2xl border border-[#242A4E] bg-[#12162B] p-10 text-center space-y-3">
              <Search size={32} className="mx-auto text-[#64748B]" />
              <p className="text-sm font-bold text-white">Không tìm thấy bài viết phù hợp</p>
              <p className="text-xs text-[#94A3B8]">
                Thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Tất cả đề&quot; để xem toàn bộ danh mục.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("all");
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

      {/* 5. Supabase Dynamic Tasks Integration */}
      {items.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[#242A4E]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-lg text-white">Nhiệm Vụ Writing Từ Hệ Thống Đã Lưu</h2>
              <p className="text-xs text-[#94A3B8]">Dữ liệu bài tập Writing được đồng bộ từ Supabase</p>
            </div>
            <span className="text-xs font-mono text-[#00F0FF]">{items.length} nhiệm vụ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.slug}
                className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 flex flex-col justify-between writing-glow-card"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#A855F7]/20 text-[#C084FC]">
                      {item.difficulty.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#94A3B8]">{Math.round(item.timeLimitSeconds / 60)}m</span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{item.title}</h4>
                  <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{item.description}</p>
                </div>

                <Link
                  href={`/practice/writing/${item.slug}`}
                  className="mt-4 py-2 rounded-xl text-xs font-bold bg-[#1E2442] hover:bg-[#5B5FEF] text-center text-[#EEF0FF] hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Mở bài viết</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Writing Zen Focus Modal */}
      <QuickWritingModal
        task={activeTaskModal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
