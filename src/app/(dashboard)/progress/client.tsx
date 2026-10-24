"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Lightbulb,
  Medal,
  Mic,
  PlayCircle,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { ScoreTrajectory3D, type TrajectoryWeek } from "./components/ScoreTrajectory3D";
import { SkillRadar3D, type SkillItem } from "./components/SkillRadar3D";
import "./progress.css";

interface TimeRangeData {
  hours: string;
  hoursSub: string;
  lessons: number;
  lessonsPct: number;
  band: string;
  bandBadge: string;
  confidence: string;
  streak: string;
  weeks: TrajectoryWeek[];
}

const TIME_RANGES: Record<"7d" | "30d" | "all", TimeRangeData> = {
  "7d": {
    hours: "24h 45m",
    hoursSub: "+12% so với tuần trước",
    lessons: 38,
    lessonsPct: 31,
    band: "7.0",
    bandBadge: "+0.5 tăng",
    confidence: "75%",
    streak: "12 Ngày",
    weeks: [
      { id: 0, label: "Tuần 1", band: 5.5, hours: "14h", note: "Khởi đầu lộ trình A2-B1" },
      { id: 1, label: "Tuần 2", band: 5.8, hours: "16h", note: "Chuẩn hóa IPA & Vocab" },
      { id: 2, label: "Tuần 3", band: 6.0, hours: "19h", note: "Vượt qua Milestone Test 1" },
      { id: 3, label: "Tuần 4", band: 6.5, hours: "21h", note: "Bứt phá Reading 7.5" },
      { id: 4, label: "Tuần 5", band: 6.8, hours: "22h", note: "Tăng tốc Listening Part 2-3" },
      { id: 5, label: "Hiện tại", band: 7.0, hours: "24h 45m", note: "Cách mục tiêu 7.5 chỉ 0.5 band!" },
    ],
  },
  "30d": {
    hours: "92h 15m",
    hoursSub: "+24% so với tháng trước",
    lessons: 38,
    lessonsPct: 31,
    band: "7.0",
    bandBadge: "+1.0 tăng",
    confidence: "82%",
    streak: "12 Ngày",
    weeks: [
      { id: 0, label: "Tuần 1", band: 5.2, hours: "12h", note: "Diagnostic Test đầu vào" },
      { id: 1, label: "Tuần 2", band: 5.6, hours: "15h", note: "Hoàn thành 500 từ vựng" },
      { id: 2, label: "Tuần 3", band: 6.1, hours: "18h", note: "Luyện nghe Map & Form" },
      { id: 3, label: "Tuần 4", band: 6.4, hours: "20h", note: "Viết luận Task 2 PEEL" },
      { id: 4, label: "Tuần 5", band: 6.8, hours: "23h", note: "Mock Test Speaking AI" },
      { id: 5, label: "Hiện tại", band: 7.0, hours: "24h 45m", note: "Đạt ngưỡng Band 7.0 ổn định" },
    ],
  },
  all: {
    hours: "148h 30m",
    hoursSub: "Tổng thời gian tích lũy",
    lessons: 38,
    lessonsPct: 31,
    band: "7.0",
    bandBadge: "+1.5 từ đầu khóa",
    confidence: "88%",
    streak: "12 Ngày",
    weeks: [
      { id: 0, label: "Tuần 1", band: 5.0, hours: "10h", note: "Điểm xuất phát" },
      { id: 1, label: "Tuần 2", band: 5.5, hours: "14h", note: "Nền tảng ngữ pháp" },
      { id: 2, label: "Tuần 3", band: 6.0, hours: "19h", note: "Pre-IELTS Chiến thuật" },
      { id: 3, label: "Tuần 4", band: 6.5, hours: "21h", note: "Reading & Listening bứt phá" },
      { id: 4, label: "Tuần 5", band: 6.8, hours: "23h", note: "Tối ưu từ vựng học thuật" },
      { id: 5, label: "Hiện tại", band: 7.0, hours: "24h 45m", note: "Sẵn sàng tiến tới 7.5" },
    ],
  },
};

const INITIAL_SKILLS: SkillItem[] = [
  {
    id: "reading",
    name: "Reading",
    band: 7.5,
    progress: 85,
    status: "Điểm mạnh",
    barColor: "bg-emerald-500",
    badgeClass: "bg-emerald-950/90 text-emerald-400 border-emerald-500/30",
    statusClass: "text-emerald-400",
  },
  {
    id: "listening",
    name: "Listening",
    band: 7.0,
    progress: 75,
    status: "Ổn định",
    barColor: "bg-emerald-500",
    badgeClass: "bg-emerald-950/90 text-emerald-400 border-emerald-500/30",
    statusClass: "text-emerald-400",
  },
  {
    id: "speaking",
    name: "Speaking",
    band: 6.5,
    progress: 65,
    status: "Cần chú ý",
    barColor: "bg-amber-500",
    badgeClass: "bg-amber-950/90 text-amber-400 border-amber-500/30",
    statusClass: "text-amber-500",
  },
  {
    id: "writing",
    name: "Writing",
    band: 6.0,
    progress: 60,
    status: "Cần chú ý",
    barColor: "bg-amber-500",
    badgeClass: "bg-amber-950/90 text-amber-400 border-amber-500/30",
    statusClass: "text-amber-500",
  },
  {
    id: "vocab",
    name: "Vocabulary",
    scrollLabel: "Vocab",
    band: 7.0,
    progress: 80,
    status: "Điểm mạnh",
    barColor: "bg-indigo-500",
    badgeClass: "bg-indigo-950/90 text-indigo-300 border-indigo-500/40",
    statusClass: "text-indigo-400",
  },
  {
    id: "grammar",
    name: "Grammar",
    band: 6.5,
    progress: 70,
    status: "Khá tốt",
    barColor: "bg-indigo-500",
    badgeClass: "bg-indigo-950/90 text-indigo-300 border-indigo-500/40",
    statusClass: "text-indigo-400",
  },
];

const HEATMAP_LEVELS = [
  0, 1, 2, 1, 3, 2, 1, 3, 2, 1, 0, 1,
  1, 3, 2, 1, 2, 1, 3, 2, 1, 1, 2, 0,
  0, 1, 2, 2, 3, 1, 2, 3, 1, 2, 1, 1,
  1, 0, 1, 1, 2, 1, 2, 1, 0, 1, 1, 2,
];

const HEATMAP_COLORS: Record<number, string> = {
  0: "bg-[#1c1f2e]",
  1: "bg-[#2a2956]",
  2: "bg-[#4338ca]",
  3: "bg-[#6366f1]",
};

export interface ProgressClientProps {
  initialStreak?: number;
  initialCompletedLessons?: number;
  initialTargetBand?: number | string;
}

export function ProgressClient({
  initialStreak = 12,
  initialCompletedLessons = 38,
  initialTargetBand = "7.5",
}: ProgressClientProps) {
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number>(5);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("reading");
  const [skills, setSkills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [isHeatmap3D, setIsHeatmap3D] = useState(false);

  // Modals state
  const [isPronunciationModalOpen, setIsPronunciationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ title: string; desc: string; open: boolean }>({
    title: "",
    desc: "",
    open: false,
  });

  const showToast = (title: string, desc: string) => {
    setToast({ title, desc, open: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 3500);
  };

  const currentData = TIME_RANGES[timeRange];

  const handleSimulateBoost = () => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id === "speaking") return { ...s, band: 6.8, progress: 75, status: "Tiến bộ nhanh" };
        if (s.id === "writing") return { ...s, band: 6.5, progress: 70, status: "Ổn định" };
        return s;
      })
    );
    showToast("AI Band Optimization", "Đã mô phỏng cải thiện kỹ năng Speaking & Writing lên +0.3 band!");
  };

  const completePronunciationDrill = () => {
    setIsPronunciationModalOpen(false);
    setSkills((prev) =>
      prev.map((s) => (s.id === "speaking" ? { ...s, band: s.band + 0.2, progress: 72 } : s))
    );
    showToast("Speaking Part 2 Boost", "Chúc mừng! Hoàn thành bài tập nguyên âm đôi (+0.2 Speaking).");
  };

  return (
    <div className="progress-root w-full py-8">
      <main className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. HEADER & FILTER CONTROLS */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#1e1b4b] border border-indigo-500/40 text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                ANALYTICS HUB
              </span>
              <span className="text-gray-400 text-xs font-medium">
                • Cập nhật lần cuối: <strong className="text-gray-300">Hôm nay, 08:30</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-white">
              Báo cáo & Tiến độ học tập
            </h1>
          </div>

          {/* Time Switcher & PDF Export */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#141621] border border-[#232637]">
              {(["7d", "30d", "all"] as const).map((range) => {
                const label =
                  range === "7d" ? "7 ngày qua" : range === "30d" ? "Tháng này" : "Toàn thời gian";
                const isSelected = timeRange === range;
                return (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected
                        ? "bg-[#252347] text-indigo-300 border-indigo-500/40 shadow-sm"
                        : "text-gray-400 hover:text-gray-200 border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"
              aria-label="Xuất báo cáo PDF"
            >
              <Download className="w-4 h-4" />
              <span>Xuất báo cáo PDF</span>
            </button>
          </div>
        </div>

        {/* 2. FOUR TOP KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Tổng giờ học */}
          <div className="kpi-card rounded-2xl bg-[#141621] border border-[#232637] p-5 cursor-pointer">
            <div className="kpi-corner-circle bg-indigo-500/10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-400">Tổng giờ học</span>
              <div className="w-8 h-8 rounded-full bg-[#1c1e2f] border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-2">
              {currentData.hours}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{currentData.hoursSub}</span>
            </div>
          </div>

          {/* KPI 2: Bài học đã xong */}
          <div className="kpi-card rounded-2xl bg-[#141621] border border-[#232637] p-5 cursor-pointer">
            <div className="kpi-corner-circle bg-indigo-500/10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-400">Bài học đã xong</span>
              <div className="w-8 h-8 rounded-full bg-[#1c1e2f] border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2.5">
              <span className="text-3xl font-black text-white tracking-tight">
                {currentData.lessons}
              </span>
              <span className="text-base font-bold text-gray-400">/ 120 bài</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#232637] overflow-hidden mb-2">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${currentData.lessonsPct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Hoàn thành {currentData.lessonsPct}% lộ trình
            </p>
          </div>

          {/* KPI 3: Band dự phóng */}
          <div className="kpi-card rounded-2xl bg-[#141621] border border-[#232637] p-5 cursor-pointer">
            <div className="kpi-corner-circle bg-indigo-500/10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-400">Band dự phóng</span>
              <div className="w-8 h-8 rounded-full bg-[#1c1e2f] border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-3xl font-black text-white tracking-tight">
                {currentData.band}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                {currentData.bandBadge}
              </span>
            </div>
            <p className="text-xs font-medium text-indigo-400">
              Độ tin cậy mô hình: <strong>{currentData.confidence}</strong>
            </p>
          </div>

          {/* KPI 4: Chuỗi liên tục (Streak) */}
          <div className="kpi-card rounded-2xl bg-[#141621] border border-[#232637] p-5 cursor-pointer">
            <div className="kpi-corner-circle bg-amber-500/10" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-400">Chuỗi liên tục (Streak)</span>
              <div className="w-8 h-8 rounded-full bg-[#27201c] border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-2">
              {currentData.streak}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Medal className="w-3.5 h-3.5" />
              <span>Đang giữ kỷ lục cá nhân!</span>
            </div>
          </div>
        </div>

        {/* 3. AI SMART INSIGHT BANNER */}
        <div className="rounded-2xl bg-gradient-to-r from-[#171829] via-[#181a2c] to-[#151724] border border-indigo-500/30 p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 flex-shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400">
                  AI SMART INSIGHT
                </span>
                <span className="text-xs text-gray-400">
                  • Phát hiện điểm yếu cần tối ưu ngay
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-white">
                Bạn đang gặp khó khăn nhỏ với cấu trúc phát âm nguyên âm đôi trong phần Speaking Part 2.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPronunciationModalOpen(true)}
            className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-[#11131d] hover:bg-[#1d2032] text-gray-100 border border-[#232637] hover:border-indigo-500/50 text-xs font-bold flex items-center justify-center gap-2 transition shrink-0 shadow"
          >
            <PlayCircle className="w-4 h-4 text-indigo-400" />
            <span>Khắc phục ngay: Luyện phát âm nguyên âm đôi (15 phút)</span>
          </button>
        </div>

        {/* 4. MAIN 12-COLUMN ANALYTICS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (8 COLS): 3D TRAJECTORY & 6 SKILLS */}
          <div className="lg:col-span-8 space-y-6">
            {/* CARD A: 3D SCORE TRAJECTORY */}
            <ScoreTrajectory3D
              weeks={currentData.weeks}
              selectedWeekIndex={selectedWeekIdx}
              onSelectWeek={(idx) => setSelectedWeekIdx(idx)}
            />

            {/* CARD B: CHI TIẾT 6 KỸ NĂNG CỐT LÕI */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Chi tiết 6 Kỹ năng cốt lõi
                </h2>
                <span className="text-xs text-gray-400 font-medium">
                  Đánh giá chuẩn IELTS Format • Click để soi trên Radar 3D
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {skills.map((s) => {
                  const isSelected = s.id === selectedSkillId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSkillId(s.id)}
                      className={`rounded-2xl bg-[#141621] hover:bg-[#191c2b] border p-5 cursor-pointer transition group ${
                        isSelected
                          ? "border-indigo-500 ring-1 ring-indigo-500/40"
                          : "border-[#232637]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition">
                          {s.name}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${s.badgeClass}`}
                        >
                          Band {s.band.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-400 font-medium">
                          Tiến độ: <strong className="text-gray-200">{s.progress}%</strong>
                        </span>
                        <span className={`font-bold ${s.statusClass}`}>{s.status}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#232637] overflow-hidden">
                        <div
                          className={`h-full ${s.barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${s.progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (4 COLS): 3D RADAR, VOCAB VAULT, HEATMAP */}
          <div className="lg:col-span-4 space-y-6">
            {/* CARD 1: 3D RADAR */}
            <SkillRadar3D
              skills={skills}
              selectedSkillId={selectedSkillId}
              onSelectSkill={(id) => setSelectedSkillId(id)}
              onSimulateBoost={handleSimulateBoost}
            />

            {/* CARD 2: VOCABULARY VAULT */}
            <div className="rounded-2xl bg-[#141621] border border-[#232637] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-white">Vocabulary Vault</h3>
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </div>

              <div className="rounded-xl bg-[#191c2a] border border-[#232637] p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">Tổng từ đã lưu</p>
                  <p className="text-2xl font-black text-white leading-tight">1,240</p>
                  <p className="text-xs font-semibold text-gray-400">từ vựng SRS</p>
                </div>

                <div className="pl-3 border-l border-[#232637]">
                  <p className="text-[11px] text-gray-400 mb-1">Cần ôn tập ngay</p>
                  <p className="text-2xl font-black text-amber-500 leading-tight">35</p>
                  <p className="text-xs font-semibold text-amber-400">từ đến hạn</p>
                </div>

                <button
                  onClick={() => router.push("/learn/vocabulary")}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 shrink-0"
                  aria-label="Ôn tập từ vựng"
                >
                  Ôn tập
                </button>
              </div>
            </div>

            {/* CARD 3: BẢN ĐỒ HOẠT ĐỘNG (HEATMAP MATRIX) */}
            <div className="rounded-2xl bg-[#141621] border border-[#232637] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-white">Bản đồ hoạt động</h3>
                  <p className="text-[11px] text-gray-400">365 ngày học tập</p>
                </div>
                <button
                  onClick={() => setIsHeatmap3D((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-[#1d2030] hover:bg-indigo-600/30 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 transition"
                  aria-label="Bật tắt khối nổi 3D Heatmap"
                >
                  Khối nổi 3D: {isHeatmap3D ? "Bật" : "Tắt"}
                </button>
              </div>

              {/* Heatmap Matrix */}
              <div
                className={`grid grid-cols-12 gap-1.5 py-2 transition-transform duration-500 ${
                  isHeatmap3D ? "heatmap-grid-3d" : ""
                }`}
              >
                {HEATMAP_LEVELS.map((lvl, idx) => {
                  const mins = lvl === 0 ? 0 : lvl * 25 + 10;
                  return (
                    <div
                      key={idx}
                      data-level={lvl}
                      onClick={() =>
                        showToast(
                          `Ngày học #${idx + 1}`,
                          mins > 0
                            ? `Đã học ${mins} phút • Hoàn thành mục tiêu ngày`
                            : "Ngày nghỉ ngơi"
                        )
                      }
                      title={`${mins} phút học`}
                      className={`heatmap-cell aspect-square rounded-[4px] ${HEATMAP_COLORS[lvl]} hover:ring-2 hover:ring-indigo-300 cursor-pointer`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-4 pt-2 border-t border-[#232637]/60">
                <span>Ít hoạt động</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1c1f2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2a2956]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4338ca]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1] shadow-[0_0_6px_#6366f1]" />
                </div>
                <span>Cực kỳ chăm chỉ</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: AI SPEAKING DIPHTHONG TRAINER */}
      {isPronunciationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drill-title"
        >
          <div className="glass-panel rounded-2xl max-w-lg w-full p-6 border border-indigo-500/40 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Mic className="w-4 h-4" />
                </span>
                <div>
                  <h3 id="drill-title" className="text-base font-extrabold text-white">
                    AI Speaking Part 2 • Luyện Nguyên Âm Đôi
                  </h3>
                  <p className="text-xs text-indigo-300">
                    Khắc phục lỗi âm /eɪ/, /aɪ/, /əʊ/ trong bài nói mô tả
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPronunciationModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                aria-label="Đóng bài tập"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#0e1018] border border-[#232637] p-4 text-center space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                Từ mục tiêu 1 / 5
              </span>
              <div className="text-3xl font-black text-white tracking-wide">
                unforgettable
              </div>
              <div className="text-sm font-mono text-emerald-400">
                /ˌʌn.fəˈɡet.ə.bəl/ — Chú ý âm chuyển tiếp
              </div>

              {/* Animated Soundwave */}
              <div className="h-14 flex items-center justify-center gap-1.5 pt-2">
                <span className="wave-bar w-1.5 h-5 bg-indigo-500 rounded-full" />
                <span className="wave-bar w-1.5 h-10 bg-indigo-400 rounded-full" />
                <span className="wave-bar w-1.5 h-7 bg-emerald-400 rounded-full" />
                <span className="wave-bar w-1.5 h-12 bg-indigo-500 rounded-full" />
                <span className="wave-bar w-1.5 h-6 bg-indigo-400 rounded-full" />
                <span className="wave-bar w-1.5 h-9 bg-emerald-400 rounded-full" />
                <span className="wave-bar w-1.5 h-4 bg-indigo-500 rounded-full" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPronunciationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
              >
                Để sau
              </button>
              <button
                onClick={completePronunciationDrill}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                Hoàn thành bài tập (+0.2 Speaking)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XUẤT BÁO CÁO PDF */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-title"
        >
          <div className="glass-panel rounded-2xl max-w-md w-full p-6 border border-indigo-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="export-title" className="text-base font-extrabold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" />
                Xuất báo cáo tiến độ học tập
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                aria-label="Đóng hộp thoại xuất"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Báo cáo tiến độ bao gồm điểm số 6 kỹ năng IELTS, quỹ đạo tăng trưởng các tuần, và danh sách bài tập đã hoàn thành chuẩn xác nhận từ Indigo Scholar.
            </p>

            <div className="p-3 rounded-xl bg-[#0e1018] border border-[#232637] text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Khoảng thời gian:</span>
                <span className="text-white font-bold">
                  {timeRange === "7d" ? "7 ngày qua" : timeRange === "30d" ? "Tháng này" : "Toàn thời gian"}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Band hiện tại:</span>
                <span className="text-indigo-400 font-bold">7.0 IELTS</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tổng giờ học:</span>
                <span className="text-emerald-400 font-bold">{currentData.hours}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setIsExportModalOpen(false);
                  if (typeof window !== "undefined") window.print();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                In / Lưu file PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST BANNER */}
      {toast.open && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm border border-indigo-500/40 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{toast.title}</p>
            <p className="text-[11px] text-gray-300">{toast.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
