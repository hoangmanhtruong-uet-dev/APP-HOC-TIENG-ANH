"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sliders,
  ChevronDown,
  Layers,
  Activity,
  Target,
  ShieldAlert,
  Search,
  X,
  Compass,
  Bookmark,
  Award,
  Check,
  Radio,
  Gauge,
  BookA
} from "lucide-react";

import type { ReadingCatalogItem } from "@/features/reading/server/content";
import {
  CURATED_PASSAGES,
  READING_BAND_STAGES,
  READING_TOPIC_TRACKS,
  type CuratedPassage,
  type ReadingBandStage
} from "./components/reading-curated-data";
import { LiveReadingLab } from "./components/LiveReadingLab";
import { QuickReadingModal } from "./components/QuickReadingModal";
import type { ReadingVisualMode } from "./components/ThreeReadingVisualizer";
import "./reading.css";

export { READING_BAND_STAGES };

// Dynamic import for Three.js 3D canvas (prevents SSR hydration error)
const ThreeReadingVisualizer = dynamic(
  () => import("./components/ThreeReadingVisualizer").then((mod) => mod.ThreeReadingVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[260px] flex items-center justify-center text-xs text-emerald-300 font-mono">
        <Activity className="w-5 h-5 animate-spin mr-2" />
        Đang nạp 3D Lexical Matrix...
      </div>
    )
  }
);

export interface ReadingHubProps {
  items: ReadingCatalogItem[];
  comprehensionRate: number;
  attemptsCount: number;
  profile: {
    current_band: number | null;
    target_band: number | null;
    daily_study_minutes: number | null;
    target_exam_date: string | null;
  } | null;
}

export function ReadingHubClient({
  items,
  comprehensionRate,
  attemptsCount,
  profile
}: ReadingHubProps) {
  // 1. Initial Band Stage
  const userTargetBand = profile?.target_band ?? 6.5;
  const initialStage = useMemo(() => {
    return (
      READING_BAND_STAGES.find((s) => {
        if (s.maxBand === 9.0) {
          return userTargetBand >= s.minBand && userTargetBand <= 9.0;
        }
        return userTargetBand >= s.minBand && userTargetBand < s.maxBand;
      }) ?? READING_BAND_STAGES[1] // Default Intermediate (5.5 - 6.5)
    );
  }, [userTargetBand]);

  const [selectedStage, setSelectedStage] = useState<ReadingBandStage>(initialStage);
  const [showBandDropdown, setShowBandDropdown] = useState(false);

  // 2. 3D Visualizer & Speed States
  const [isScanning, setIsScanning] = useState(false);
  const [visualMode, setVisualMode] = useState<ReadingVisualMode>("matrix");
  const [readingSpeedWpm, setReadingSpeedWpm] = useState<number>(240);

  // 3. Exercise Library & Filtering States
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyUncompleted, setOnlyUncompleted] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(["rd-1", "rd-3"]);
  const [vocabPopoverId, setVocabPopoverId] = useState<string | null>(null);

  // 4. Quick Reading Modal State
  const [activePracticePassage, setActivePracticePassage] = useState<CuratedPassage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Merge Curated Passages with real Supabase database items
  const allPassages = useMemo<CuratedPassage[]>(() => {
    const curated = [...CURATED_PASSAGES];

    if (items && items.length > 0) {
      items.forEach((item, idx) => {
        const exists = curated.some((c) => c.slug === item.slug);
        if (!exists) {
          curated.push({
            id: `db-${item.slug || idx}`,
            slug: item.slug,
            title: item.title,
            subtitle: item.summary,
            badge: "OFFICIAL",
            badgeColor: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30",
            passageNumber: (idx % 3 + 1) as 1 | 2 | 3,
            category: item.difficulty || "Academic Reading",
            bandRange: "6.0 - 7.5",
            bandGroup: "Band 6.5 - 7.5",
            wordCount: 820,
            estimatedMinutes: 16,
            questionsCount: item.questionCount || 10,
            completed: false,
            paraphraseTraps: 6,
            paragraphs: [
              { id: "p1", label: "Paragraph A", text: item.summary || item.title }
            ],
            vocab: [
              { word: "Analysis", meaning: "Sự phân tích chuyên sâu", ipa: "/əˈnæl.ə.sɪs/", context: "in-depth textual analysis" }
            ],
            questions: [
              {
                id: 1,
                type: "true_false_not_given",
                q: `${item.title}: Information is directly verified in Paragraph A.`,
                answer: "TRUE",
                hint: "Xem kỹ nội dung tóm tắt trong đoạn văn mở đầu."
              }
            ]
          });
        }
      });
    }

    return curated;
  }, [items]);

  // Filtered Passages
  const filteredPassages = useMemo(() => {
    return allPassages.filter((p) => {
      if (onlyUncompleted && p.completed) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSub = p.subtitle.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchCat) return false;
      }

      if (activeFilter === "ALL") return true;
      if (activeFilter === "PASSAGE_1") return p.passageNumber === 1;
      if (activeFilter === "PASSAGE_2") return p.passageNumber === 2;
      if (activeFilter === "PASSAGE_3") return p.passageNumber === 3;
      if (activeFilter === "TFNG") return p.questions.some((q) => q.type === "true_false_not_given");
      if (activeFilter === "MATCHING") return p.questions.some((q) => q.type === "matching_headings");
      if (activeFilter === "BAND_LOW") return p.bandGroup === "Band 4.5 - 6.5";
      if (activeFilter === "BAND_MID") return p.bandGroup === "Band 6.5 - 7.5";
      if (activeFilter === "BAND_HIGH") return p.bandGroup === "Band 7.5 - 9.0";
      return true;
    });
  }, [allPassages, activeFilter, searchQuery, onlyUncompleted]);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    showToast(bookmarkedIds.includes(id) ? "Đã gỡ bài đọc" : "Đã lưu bài đọc vào yêu thích");
  };

  return (
    <div className="reading-theme-root pb-32 relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fadeIn bg-emerald-600/90 text-white px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-xs font-bold border border-emerald-400/40 flex items-center gap-2">
          <Sparkles size={14} className="text-[#F6E85C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-teal-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-10 relative z-10">
        {/* =========================================================
            1. HERO SECTION WITH 3D LEXICAL MATRIX SCANNER
        ========================================================= */}
        <section className="relative rounded-3xl overflow-hidden border border-[#2B3060] bg-gradient-to-br from-[#141731] via-[#0E1528] to-[#122238] shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10 items-center relative">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-6 relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
                  READING TRAINING ARENA
                </div>

                {/* Band Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBandDropdown(!showBandDropdown)}
                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {selectedStage.name} (Band {selectedStage.bandRange})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showBandDropdown && (
                    <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#141731] border border-[#2B3060] shadow-2xl p-2 z-50 backdrop-blur-xl">
                      {READING_BAND_STAGES.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedStage(b);
                            setShowBandDropdown(false);
                            showToast(`Đã chọn mục tiêu Reading: ${b.name} (${b.bandRange})`);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                            selectedStage.id === b.id
                              ? "bg-emerald-600 text-white"
                              : "text-zinc-300 hover:bg-[#1B1F40]"
                          }`}
                        >
                          <div>
                            <div className="font-bold">{b.name} ({b.bandRange})</div>
                            <div className="text-[10px] text-zinc-400 font-normal">{b.vietnameseTitle}</div>
                          </div>
                          {selectedStage.id === b.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
                  Luyện Đọc IELTS Thực Chiến{" "}
                  <span className="block mt-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-[#F6E85C] bg-clip-text text-transparent">
                    Skimming Nhanh & Bóc Tách Bẫy Logic.
                  </span>
                </h1>
                <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Làm chủ kỹ thuật quét thông tin trong <span className="text-emerald-300 font-medium">Passage 1, 2 và 3</span>, giải mã triệt để bẫy{" "}
                  <span className="text-[#F6E85C] font-medium">True/False/Not Given</span> và nâng tốc độ đọc học thuật lên trên <code className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 text-xs">250 WPM</code>.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    const el = document.getElementById("live-reading-lab");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Target className="w-4 h-4 stroke-[2.5]" />
                  <span>Luyện Bẫy True/False/NG Ngay</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("passage-library");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 border border-indigo-400/40 text-white font-semibold text-sm backdrop-blur-md transition-colors"
                >
                  <span>Khám phá kho bài đọc</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsScanning(!isScanning)}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                    isScanning
                      ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300"
                  }`}
                >
                  <Radio
                    className={`w-4 h-4 ${
                      isScanning ? "animate-spin text-emerald-400" : "text-emerald-400"
                    }`}
                  />
                  <span>{isScanning ? "Đang Quét Laser 3D" : "Kích hoạt Quét Laser 3D"}</span>
                </button>
              </div>

              {/* Mini Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-xl">
                <div className="p-3.5 rounded-2xl bg-[#0C0E1D]/80 border border-[#2B3060]">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    MỤC TIÊU TUẦN
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">3</span>
                    <span className="text-xs text-zinc-400">/ 5 bài</span>
                    <span className="ml-auto text-[11px] text-emerald-300 font-semibold">
                      {attemptsCount} lượt làm
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-[#1B1F40] rounded-full overflow-hidden">
                    <div className="h-full w-[60%] bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0C0E1D]/80 border border-[#2B3060]">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-teal-400" />
                    ĐỘ HIỂU BÀI
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-black text-teal-300">{comprehensionRate}%</span>
                    <span className="text-[10px] text-teal-300/80 bg-teal-500/15 px-1.5 py-0.5 rounded border border-teal-500/30">
                      IELTS Target
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-[#1B1F40] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${comprehensionRate}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0C0E1D]/80 border border-[#2B3060]">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    TỐC ĐỘ ĐỌC (WPM)
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-black text-amber-300 block truncate">
                      {readingSpeedWpm} WPM
                    </span>
                    <span className="text-[11px] text-zinc-400">Chuẩn IELTS: 240+ WPM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: 3D Cybernetic Lexical Matrix */}
            <div className="lg:col-span-5 flex flex-col gap-4 relative">
              <div className="relative rounded-2xl bg-[#0C0E1D]/90 border border-emerald-500/30 overflow-hidden shadow-2xl min-h-[300px] flex flex-col justify-between">
                <div className="p-3.5 flex items-center justify-between border-b border-[#2B3060]/70 relative z-10 bg-[#0C0E1D]/50 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Activity
                      className={`w-4 h-4 ${
                        isScanning ? "text-emerald-400 animate-pulse" : "text-indigo-400"
                      }`}
                    />
                    <span className="text-xs font-bold tracking-wide text-zinc-200">
                      3D LEXICAL MATRIX SCANNER
                    </span>
                  </div>

                  {/* Mode Buttons */}
                  <div className="flex items-center gap-1 bg-[#141731] p-0.5 rounded-lg border border-[#2B3060]">
                    {(
                      [
                        { id: "matrix" as const, label: "Matrix" },
                        { id: "laser" as const, label: "Laser" },
                        { id: "cluster" as const, label: "Cluster" }
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setVisualMode(m.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                          visualMode === m.id
                            ? "bg-emerald-600 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Canvas */}
                <div className="relative flex-1 flex items-center justify-center">
                  <ThreeReadingVisualizer
                    isScanning={isScanning}
                    visualMode={visualMode}
                    readingSpeedWpm={readingSpeedWpm}
                  />

                  {/* Overlay Info */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 rounded-xl bg-[#141731]/85 border border-[#2B3060] backdrop-blur-md text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isScanning ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                        }`}
                      />
                      <span className="text-zinc-300 font-medium truncate">
                        {isScanning ? "Đang quét trường ngữ nghĩa..." : "Di chuột để xoay ma trận từ vựng"}
                      </span>
                    </div>
                    <span className="text-emerald-300 font-mono font-bold ml-2 shrink-0">
                      {readingSpeedWpm} WPM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            2. LIVE READING MINI-LAB (T/F/NG, WPM & MATCHING HEADINGS)
        ========================================================= */}
        <LiveReadingLab onWpmUpdate={(wpm) => setReadingSpeedWpm(wpm)} />

        {/* =========================================================
            3. 4 CHẾ ĐỘ ĐỌC CHUYÊN SÂU (BENTO GRID)
        ========================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                4 Chế Độ Luyện Đọc Chuyên Sâu
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Chọn phương pháp phù hợp với từng giai đoạn ôn luyện
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bento 1: Skimming & Scanning */}
            <div
              onClick={() => {
                const el = document.getElementById("live-reading-lab");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="lg:col-span-5 group cursor-pointer relative rounded-3xl bg-gradient-to-br from-[#141731] via-[#10132B] to-[#132A33] border border-emerald-500/30 hover:border-emerald-400 p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 overflow-hidden"
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold tracking-wide uppercase">
                    ★ TỐC ĐỘ CAO
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-200 transition-colors">
                    Skimming & Scanning (Đọc Lướt & Định Vị)
                  </h3>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    Luyện mắt quét tìm mốc thời gian, tên riêng, thuật ngữ trong 30 giây để định vị
                    đoạn chứa đáp án mà không cần đọc từng chữ.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0C0E1D] border border-[#2B3060] text-xs font-mono space-y-1">
                  <div className="text-zinc-400">Scanning keywords: "multispectral", "LiDAR", "Guatemala"</div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span>✓ Định vị xong trong 12 giây</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2B3060]/70 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                <span className="underline underline-offset-4">Thử thách bấm giờ đọc ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Bento 2: Deep Academic Passages */}
            <div className="lg:col-span-4 group relative rounded-3xl bg-[#141731] border border-[#2B3060] hover:border-cyan-500/40 p-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Deep Academic Passages</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Đọc hiểu sâu các bài nghiên cứu học thuật phức tạp (Passage 2 & 3) về sinh thái,
                    khảo cổ học và vật lý học.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["Passage 1 (Dễ)", "Passage 2 (Vừa)", "Passage 3 (Khó)"].map((p, idx) => (
                    <button
                      key={p}
                      onClick={() => {
                        setActiveFilter(`PASSAGE_${idx + 1}`);
                        document.getElementById("passage-library")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#2B3060] bg-[#0C0E1D] text-zinc-300 hover:text-white transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter("PASSAGE_3");
                  document.getElementById("passage-library")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-6 pt-4 border-t border-[#2B3060]/70 flex items-center justify-between text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>Xem các bài đọc Passage 3</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Bento 3: Vocabulary in Context */}
            <div className="lg:col-span-3 group relative rounded-3xl bg-[#141731] border border-[#2B3060] hover:border-indigo-500/40 p-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <BookA className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Từ Vựng Ngữ Cảnh</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Học từ vựng học thuật C1/C2 trực tiếp trong ngữ cảnh bài đọc thực tế thay vì học thuộc lòng.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0C0E1D] border border-[#2B3060] text-[11px] text-zinc-300 space-y-1">
                  <div className="font-bold text-indigo-300">Academic Word List (AWL):</div>
                  <div className="text-zinc-400">• Anthropogenic, Eschew, Periphery...</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter("ALL");
                  document.getElementById("passage-library")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-6 pt-4 border-t border-[#2B3060]/70 flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>Luyện từ vựng theo bài</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Bento Banner 4: Full Test Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-[#141731] via-[#10242E] to-[#123630] border border-emerald-400/30 p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
            <div className="flex items-start sm:items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-lg shadow-emerald-500/20">
                <Award className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    Full Reading Comprehension Test (Đề Thi Chuẩn 60 Phút)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold">
                    CAMBRIDGE FORMAT
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
                  Mô phỏng áp lực phòng thi thật với <strong className="text-white">3 Passages (40 câu hỏi, 60 phút)</strong>. Bấm giờ đếm ngược, giao diện chia đôi cột chuẩn thi máy và chấm điểm thang 9.0.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActivePracticePassage(allPassages[0])}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
            >
              <span>Vào thi thử Full Reading</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* =========================================================
            4. KHO BÀI ĐỌC THỰC CHIẾN (PASSAGE LIBRARY)
        ========================================================= */}
        <section id="passage-library" className="space-y-6 pt-2 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Compass className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Kho Bài Đọc Thực Chiến ({filteredPassages.length})
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Đang lọc theo: <strong className="text-emerald-300">{selectedStage.name} (Band {selectedStage.bandRange})</strong> • Tích hợp Split-View & tra cứu từ vựng
              </p>
            </div>

            {/* Search & Only Uncompleted */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài đọc, chủ đề, Passage..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#141731] border border-[#2B3060] focus:border-emerald-400 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setOnlyUncompleted(!onlyUncompleted)}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                  onlyUncompleted
                    ? "bg-emerald-600/25 border-emerald-400 text-emerald-200"
                    : "bg-[#141731] border-[#2B3060] text-zinc-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Chưa đọc</span>
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "ALL", label: "Tất cả bài đọc" },
              { id: "PASSAGE_1", label: "Passage 1 (Dễ)" },
              { id: "PASSAGE_2", label: "Passage 2 (Vừa)" },
              { id: "PASSAGE_3", label: "Passage 3 (Học thuật)" },
              { id: "TFNG", label: "🎯 Bẫy True/False/NG" },
              { id: "MATCHING", label: "📑 Matching Headings" },
              { id: "BAND_LOW", label: "Band 4.5 - 6.5" },
              { id: "BAND_MID", label: "Band 6.5 - 7.5" },
              { id: "BAND_HIGH", label: "Band 7.5 - 9.0" }
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                  activeFilter === chip.id
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30"
                    : "bg-[#141731] border-[#2B3060] text-zinc-300 hover:bg-[#1B1F40] hover:text-white"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Passages Grid */}
          {filteredPassages.length === 0 ? (
            <div className="rounded-3xl bg-[#141731] border border-[#2B3060] p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-zinc-500 mx-auto" />
              <div className="text-base font-bold text-white">Không tìm thấy bài đọc phù hợp</div>
              <p className="text-xs text-zinc-400">Hãy thử xóa bộ lọc hoặc tìm kiếm bằng từ khóa khác.</p>
              <button
                onClick={() => {
                  setActiveFilter("ALL");
                  setSearchQuery("");
                  setOnlyUncompleted(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-500"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPassages.map((passage) => {
                const isBookmarked = bookmarkedIds.includes(passage.id);

                return (
                  <article
                    key={passage.id}
                    className="group rounded-3xl p-6 flex flex-col justify-between border border-[#2B3060] bg-[#141731] hover:bg-[#1B1F40] hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300"
                  >
                    <div>
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-gradient-to-r ${passage.badgeColor}`}
                          >
                            Passage {passage.passageNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Band {passage.bandRange}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleBookmark(passage.id)}
                          title={isBookmarked ? "Gỡ khỏi yêu thích" : "Lưu bài đọc"}
                          aria-label="Lưu bài đọc"
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                            isBookmarked
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                              : "bg-[#0C0E1D] border-[#2B3060] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${isBookmarked ? "fill-emerald-400 text-emerald-400" : ""}`}
                          />
                        </button>
                      </div>

                      {/* Title & Subtitle */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                          <span>{passage.title}</span>
                          {passage.completed && (
                            <span title="Đã hoàn thành">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                          {passage.subtitle}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="mt-4 pt-3 border-t border-[#2B3060]/60 flex items-center justify-between text-xs text-zinc-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            ~{passage.estimatedMinutes}m
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            {passage.wordCount} từ
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-300/90">{passage.category}</span>
                      </div>

                      {/* Paraphrase & Vocab Trigger */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] bg-[#0C0E1D] px-3 py-1.5 rounded-xl border border-[#2B3060]/60">
                        <span className="text-amber-300/90 font-medium">
                          🎯 {passage.paraphraseTraps} bẫy Paraphrase
                        </span>
                        <button
                          onClick={() => setVocabPopoverId(vocabPopoverId === passage.id ? null : passage.id)}
                          className="text-cyan-300 hover:underline font-semibold"
                        >
                          {vocabPopoverId === passage.id ? "Đóng từ vựng" : "+ Xem từ vựng key"}
                        </button>
                      </div>

                      {/* Vocab Accordion */}
                      {vocabPopoverId === passage.id && (
                        <div className="mt-2 p-3 rounded-2xl bg-[#0C0E1D] border border-cyan-500/30 space-y-1.5 text-xs animate-fadeIn">
                          {passage.vocab.map((v, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="font-bold text-white">{v.word}</span>
                              <span className="text-zinc-400">{v.meaning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons: Đọc thử & Làm bài */}
                    <div className="mt-5 grid grid-cols-12 gap-2.5 pt-1">
                      <button
                        onClick={() => setActivePracticePassage(passage)}
                        className="col-span-7 py-2.5 px-4 rounded-xl border border-[#2B3060] bg-[#1B1F40] hover:bg-[#252A56] text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <BookOpen size={14} className="text-emerald-400" />
                        <span>Đọc thử Split-View</span>
                      </button>

                      <button
                        onClick={() => setActivePracticePassage(passage)}
                        className="col-span-5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/40 text-emerald-300 hover:text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <span>Làm bài</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================
            5. CHUYÊN ĐỀ LUYỆN ĐỌC THEO CHỦ ĐỀ (TOPIC TRACKS)
        ========================================================= */}
        <section className="space-y-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Chuyên Đề Luyện Đọc Theo Lĩnh Vực
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Bao quát toàn diện các chủ đề học thuật Cambridge IELTS
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {READING_TOPIC_TRACKS.map((track) => {
              const IconComponent = track.icon;
              const isMastered = track.progress === 100;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    setSearchQuery(track.title.split(" ")[0]);
                    document.getElementById("passage-library")?.scrollIntoView({ behavior: "smooth" });
                    showToast(`Lọc bài đọc theo chủ đề: ${track.title}`);
                  }}
                  className="group cursor-pointer rounded-3xl bg-[#141731] hover:bg-[#1B1F40] border border-[#2B3060] hover:border-emerald-500/40 p-6 flex flex-col justify-between transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-[#0C0E1D] border border-[#2B3060] flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-5 h-5" />
                      </div>

                      {isMastered ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Thành thạo</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                          {track.status}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {track.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">{track.subtitle}</p>
                    </div>

                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {track.skills.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[#0C0E1D] text-zinc-300 border border-[#2B3060]"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">{track.passagesCount} bài đọc</span>
                      <span className={`font-bold ${isMastered ? "text-emerald-400" : "text-white"}`}>
                        {track.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0C0E1D] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isMastered
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400"
                        }`}
                        style={{ width: `${track.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* =========================================================
          6. QUICK READING MODAL (SPLIT-VIEW PASSAGE & QUESTIONS)
      ========================================================= */}
      {activePracticePassage && (
        <QuickReadingModal
          passage={activePracticePassage}
          onClose={() => setActivePracticePassage(null)}
        />
      )}
    </div>
  );
}
