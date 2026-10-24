"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ROADMAP_NODES, type RoadmapNode } from "./components/RoadmapTree3D";
import "./roadmap.css";

const RoadmapTree3D = dynamic(
  () =>
    import("./components/RoadmapTree3D").then((mod) => ({
      default: mod.RoadmapTree3D,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] rounded-2xl bg-[#070910] border border-indigo-500/30 flex items-center justify-center text-slate-400 text-xs font-semibold animate-pulse">
        Đang khởi tạo không gian 3D WebGL...
      </div>
    ),
  }
);

export interface RoadmapClientProps {
  targetBand?: string | number;
  currentBand?: string | number;
  targetExamDate?: string;
  initialDailyMinutes?: number;
}

export function RoadmapClient({
  targetBand = "6.5",
  currentBand = "4.0",
  targetExamDate = "2026-12-15",
  initialDailyMinutes = 35,
}: RoadmapClientProps) {
  const router = useRouter();

  const [activeView, setActiveView] = useState<"3d" | "list" | "cal">("3d");
  const [pacingMinutes, setPacingMinutes] = useState<number>(initialDailyMinutes);

  // Restore saved pacing from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("roadmap.pacingMinutes");
      if (saved) setPacingMinutes(Number(saved));
    } catch {
      // ignore
    }
  }, []);

  const handlePacingChange = (val: number) => {
    setPacingMinutes(val);
    try {
      localStorage.setItem("roadmap.pacingMinutes", JSON.stringify(val));
    } catch {
      // ignore
    }
  };

  // Remaining days to target exam date
  const daysToExam = useMemo(() => {
    if (!targetExamDate) return 74;
    const targetTime = new Date(targetExamDate).getTime();
    const diff = Math.ceil((targetTime - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 74;
  }, [targetExamDate]);

  // Projected finish date based on pacing simulator
  const { projectedFinishDateStr, isAheadOfSchedule } = useMemo(() => {
    // Total estimated hours required to complete current phase 2 & 3: ~45 hours
    const estimatedHoursNeeded = 45;
    const daysNeeded = Math.ceil((estimatedHoursNeeded * 60) / pacingMinutes);
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysNeeded);

    const projectedFinishDateStr = finishDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const examDate = new Date(targetExamDate);
    const isAheadOfSchedule = finishDate <= examDate;

    return { projectedFinishDateStr, isAheadOfSchedule };
  }, [pacingMinutes, targetExamDate]);

  // Formatted exam date
  const formattedExamDate = useMemo(() => {
    try {
      const d = new Date(targetExamDate);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "15/12/2026";
    }
  }, [targetExamDate]);

  const handleContinueLesson = (node?: RoadmapNode) => {
    if (node?.targetHref) {
      router.push(node.targetHref);
    } else {
      router.push("/learn");
    }
  };

  const handleTestOut = () => {
    router.push("/mock-tests");
  };

  return (
    <div className="roadmap-root w-full min-h-screen py-8">
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6">
        {/* HEADER & VIEW SWITCHER */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                IELTS ACADEMIC {targetBand}
              </span>
              <span className="text-xs text-slate-400">
                • Trình độ khởi điểm: {currentBand} (A2 Elementary)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
              BẢN ĐỒ LỘ TRÌNH CÁ NHÂN HÓA
            </h1>
          </div>

          {/* 3 VIEW TABS */}
          <div className="inline-flex p-1 rounded-xl bg-[#131722] border border-white/10 self-start">
            <button
              onClick={() => setActiveView("3d")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeView === "3d"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              aria-label="Chuyển chế độ Bản đồ cây 3D"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
              </svg>
              Bản đồ cây 3D
            </button>
            <button
              onClick={() => setActiveView("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeView === "list"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              aria-label="Chuyển chế độ Danh sách"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Danh sách
            </button>
            <button
              onClick={() => setActiveView("cal")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeView === "cal"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              aria-label="Chuyển chế độ Lịch học"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Lịch học
            </button>
          </div>
        </div>

        {/* 2-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            {/* VIEW 1: THREE.JS 3D ROADMAP */}
            {activeView === "3d" && (
              <div className="roadmap-fade-in space-y-5">
                <RoadmapTree3D
                  pacingMinutes={pacingMinutes}
                  onContinueLesson={handleContinueLesson}
                  onTestOut={handleTestOut}
                />
              </div>
            )}

            {/* VIEW 2: LIST VIEW */}
            {activeView === "list" && (
              <div className="roadmap-fade-in space-y-6">
                {/* PHASE 1 */}
                <div className="glass-card rounded-2xl p-5 space-y-3 border border-emerald-500/20">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    ✓ Phase 1: Nền tảng cơ bản (A1 - A2) • Hoàn thành 100%
                  </span>
                  <div className="p-4 rounded-xl bg-[#161926] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white">500 Từ vựng đời sống cốt lõi</h4>
                        <p className="text-xs text-slate-400">Đã hoàn thành • Đạt điểm tuyệt đối</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-white">95/100</span>
                      <button
                        onClick={() => router.push("/learn/vocabulary")}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        ↻ Xem lại
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#161926] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white">
                          Ngữ pháp cơ bản & Phát âm IPA
                        </h4>
                        <p className="text-xs text-slate-400">
                          Đã hoàn thành bài kiểm tra cuối chặng
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-white">88/100</span>
                      <button
                        onClick={() => router.push("/learn/grammar")}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        ↻ Xem lại
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        ⚡
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white">
                          Milestone Test 1: Nền tảng tổng hợp
                        </h4>
                        <p className="text-xs text-slate-400">
                          Trạng thái: Đạt chứng nhận (Passed)
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-white">90/100đ</span>
                  </div>
                </div>

                {/* PHASE 2 */}
                <div className="glass-card rounded-2xl p-5 space-y-4 border border-indigo-500/30">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white">
                    Phase 2: Pre-IELTS chiến thuật (4.0 - 5.0) • Đang học
                  </span>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-white">Tiến độ tổng chặng: 40%</span>
                      <span className="text-slate-400">4/10 bài tập hoàn thành</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: "40%" }} />
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[#161929] border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        BÀI HỌC TIẾP THEO
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                        Đang diễn ra
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-white">
                      Unit 2: Quá khứ đơn & Kỹ thuật Paraphrase
                    </h3>
                    <p className="text-xs text-slate-400">
                      Listening Part 2 - Bản đồ & Chỉ đường trong phòng thi thực chiến.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={() => router.push("/learn")}
                        className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                      >
                        Học tiếp: Unit 2 - Quá khứ đơn →
                      </button>
                      <button
                        onClick={handleTestOut}
                        className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-white/10 transition"
                      >
                        ⚡ Làm bài vượt cấp (Test-out)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-[#141724] flex justify-between items-center">
                      <span className="text-slate-200 font-medium">
                        ▸ Unit 1: Ngữ pháp nền tảng Speaking Part 1
                      </span>
                      <span className="text-emerald-400 font-semibold">✓ Hoàn thành</span>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex justify-between items-center">
                      <span className="text-white font-semibold">
                        ● Unit 2: Quá khứ đơn & Kỹ thuật Paraphrase
                      </span>
                      <span className="text-indigo-300 font-semibold">Đang học (50%)</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#141724] flex justify-between items-center text-slate-400">
                      <span>○ Unit 3: Reading Skimming & Scanning chuyên sâu</span>
                      <span>Sắp mở</span>
                    </div>
                  </div>
                </div>

                {/* PHASE 3 */}
                <div className="glass-card rounded-2xl p-5 space-y-3 opacity-75">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                    🔒 Phase 3: Bứt phá band điểm (5.5 - 6.5) • Đã khóa
                  </span>
                  <div className="p-4 rounded-xl bg-[#141722] border border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-300">
                        1. Advanced Writing Task 2 – Cấu trúc lập luận
                      </h4>
                      <p className="text-xs text-slate-500">Yêu cầu hoàn thành Phase 2 để mở khóa</p>
                    </div>
                    <span>🔒</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141722] border border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-300">
                        2. Speaking Reflex & Idioms nâng cao
                      </h4>
                      <p className="text-xs text-slate-500">Yêu cầu hoàn thành Phase 2 để mở khóa</p>
                    </div>
                    <span>🔒</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141722] border border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-300">
                        ⚡ Boss Test: Full Mock Exam mô phỏng máy tính
                      </h4>
                      <p className="text-xs text-slate-500">
                        Chứng nhận hoàn thành toàn bộ lộ trình 6.5
                      </p>
                    </div>
                    <span>🔒</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: CALENDAR VIEW */}
            {activeView === "cal" && (
              <div className="roadmap-fade-in glass-card rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4">
                  Lịch phân bổ bài học theo tuần (Tháng 10 - 12/2026)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <div className="text-emerald-400 font-bold mb-1">Tuần trước • Đã xong</div>
                    <p className="text-white font-semibold">Unit 1: Ngữ pháp Speaking Part 1</p>
                    <p className="text-slate-400 mt-1">Hoàn thành vượt tiến độ 1 ngày</p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40">
                    <div className="text-indigo-400 font-bold mb-1">Tuần này • Đang học</div>
                    <p className="text-white font-semibold">Unit 2: Quá khứ đơn & Paraphrase</p>
                    <p className="text-slate-400 mt-1">{pacingMinutes} phút/ngày • Listening Part 2</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10">
                    <div className="text-slate-400 font-bold mb-1">Tuần tới • Dự kiến</div>
                    <p className="text-white font-semibold">Unit 3: Reading Skimming & Scanning</p>
                    <p className="text-slate-400 mt-1">Mở khóa ngay sau Unit 2</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR (4 COLS) */}
          <aside className="lg:col-span-4 space-y-5">
            {/* THỜI GIAN BIỂU */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  THỜI GIAN BIỂU
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Đang đi đúng kế hoạch
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-3xl font-black text-indigo-400">{daysToExam}</span>
                <span className="text-base font-bold text-white">ngày đến kỳ thi thật</span>
              </div>
              <p className="text-xs text-slate-400">
                Ngày thi dự kiến: <strong className="text-slate-200">{formattedExamDate}</strong>{" "}
                tại IDP Vietnam.
              </p>
            </div>

            {/* AI PACING ASSISTANT */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  AI PACING ASSISTANT
                </span>
                <span className="text-indigo-400">✨</span>
              </div>
              <h3 className="text-base font-extrabold text-white mb-0.5">
                Tốc độ hiện tại: <span>{pacingMinutes}</span> phút/ngày
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Dự kiến về đích: <strong className="text-white">{projectedFinishDateStr}</strong>
              </p>
              <label htmlFor="pacing-slider" className="block text-xs text-slate-300 mb-2">
                Kéo tăng giờ học để về đích sớm (tăng tốc dòng chảy 3D):
              </label>
              <input
                id="pacing-slider"
                type="range"
                min="20"
                max="90"
                step="5"
                value={pacingMinutes}
                onChange={(e) => handlePacingChange(Number(e.target.value))}
                className="w-full cursor-pointer h-2 bg-slate-800 rounded-lg"
                aria-label="Điều chỉnh thời gian học mỗi ngày"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                <span>{pacingMinutes} phút/ngày</span>
                <span
                  className={
                    isAheadOfSchedule
                      ? "text-emerald-400 font-semibold"
                      : "text-amber-400 font-semibold"
                  }
                >
                  {isAheadOfSchedule ? "✓ Cán đích đúng hạn" : "⚠ Cần tăng tốc độ"}
                </span>
              </div>
            </div>

            {/* NĂNG LỰC KỸ NĂNG */}
            <div className="glass-card rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  NĂNG LỰC KỸ NĂNG
                </span>
                <span className="text-[11px] text-slate-400">Diagnostic Test</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">Nghe (Listening)</span>
                  <span className="text-indigo-300 font-bold">65%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: "65%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">Đọc (Reading)</span>
                  <span className="text-emerald-400 font-bold">80%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "80%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">Viết (Writing)</span>
                  <span className="text-rose-400 font-bold">35% (Cần cải thiện!)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: "35%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-200 font-medium">Nói (Speaking)</span>
                  <span className="text-indigo-300 font-bold">55%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: "55%" }} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
