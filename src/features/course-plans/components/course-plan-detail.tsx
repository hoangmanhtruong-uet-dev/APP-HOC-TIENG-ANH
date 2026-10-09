"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Play,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { formatSkillLabel, getLevelBadge, type CoursePlan } from "../model";

export function CoursePlanDetail({ plan }: { plan: CoursePlan }) {
  const router = useRouter();
  const badge = getLevelBadge(plan.level);

  // Interactive study time simulator
  const [dailyMins, setDailyMins] = useState<number>(plan.recommendedDailyMins);
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  // Dynamic calculations based on simulator
  const calculatedDays = Math.ceil((plan.totalDays * plan.recommendedDailyMins) / dailyMins);
  const [formattedFinishDate, setFormattedFinishDate] = useState<string>("");

  useEffect(() => {
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + calculatedDays);
    
    setFormattedFinishDate(
      finishDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
  }, [calculatedDays]);

  const activatePlan = () => {
    setIsActivated(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("active_course_plan", JSON.stringify(plan));
    }
  };

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-300">
      {/* Top Back Navigation */}
      <button
        onClick={() => router.push("/plans")}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} /> Trở về danh sách Lộ trình
      </button>

      {/* Hero Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs font-bold text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              {plan.durationWeeks} Tuần ({plan.totalDays} Ngày)
            </span>
            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Users size={14} /> {plan.enrolledLearnersCount.toLocaleString("en-US")} Học viên đang học
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight text-white">{plan.title}</h1>
            <p className="text-base sm:text-lg font-bold text-indigo-300 mt-2">{plan.subtitle}</p>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">{plan.description}</p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Trình độ đầu vào</span>
              <span className="text-sm font-black text-white">{plan.startingLevel}</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Band điểm mục tiêu</span>
              <span className="text-sm font-black text-amber-300">{plan.targetBand}</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Thời lượng gợi ý</span>
              <span className="text-sm font-black text-emerald-400">{plan.recommendedDailyMins} phút/ngày</span>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Tỷ lệ hoàn thành</span>
              <span className="text-sm font-black text-indigo-300">{plan.completionRatePercent}% thành công</span>
            </div>
          </div>

          {/* Activate Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={activatePlan}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                isActivated
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 shadow-amber-500/20 hover:scale-105"
              }`}
            >
              {isActivated ? (
                <>
                  <CheckCircle2 size={20} /> Lộ Trình Đã Được Kích Hoạt!
                </>
              ) : (
                <>
                  <Zap size={20} /> Kích Hoạt Lộ Trình Này Làm Kế Hoạch Chính
                </>
              )}
            </button>
            {isActivated && (
              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check size={14} /> Hệ thống đã cập nhật bài học hàng ngày lên Dashboard & Roadmap của bạn.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Study Time Simulator */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">AI Simulator</span>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} /> Mô Phỏng Tốc Độ Học & Ngày Cán Đích
            </h2>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
            Realtime Projection
          </span>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="md:col-span-7 space-y-4">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Thời gian bạn học mỗi ngày:</span>
              <span className="text-indigo-600 font-black text-sm">{dailyMins} phút / ngày</span>
            </label>
            <input
              type="range"
              min={15}
              max={90}
              step={5}
              value={dailyMins}
              onChange={(e) => setDailyMins(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>15 phút (Thư thả)</span>
              <span>45 phút (Chuẩn)</span>
              <span>90 phút (Cấp tốc)</span>
            </div>
          </div>

          <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Dự kiến hoàn thành:</span>
              <span className="font-black text-indigo-600 text-sm">{calculatedDays} ngày</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Ngày về đích:</span>
              <span className="font-black text-emerald-600 text-sm">{formattedFinishDate}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Xác suất đạt band:</span>
              <span className="font-black text-amber-500 text-sm">
                {dailyMins >= 45 ? "95% Rất cao" : dailyMins >= 30 ? "88% Khá cao" : "75% Trung bình"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Curriculum Syllabus Stepper */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Syllabus Matrix</span>
            <h2 className="text-2xl font-black text-slate-900">Nội Dung Chi Tiết Theo Giai Đoạn & Tuần Học</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">{plan.phases.length} Giai đoạn lớn</span>
        </div>

        {plan.phases.map((phase) => (
          <div key={phase.phaseNumber} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Giai Đoạn {phase.phaseNumber}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">{phase.title}</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Mục tiêu: {phase.targetOutcome}</p>
              </div>
            </div>

            {/* Weeks Accordion */}
            <div className="space-y-4">
              {phase.weeks.map((week) => {
                const isExpanded = expandedWeek === week.weekNumber;
                return (
                  <div
                    key={week.weekNumber}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => setExpandedWeek(isExpanded ? 0 : week.weekNumber)}
                      className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                        isExpanded ? "bg-indigo-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                          W{week.weekNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{week.title}</h4>
                          <p className="text-xs text-slate-500">{week.summary}</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-indigo-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </button>

                    {/* Accordion Days Body */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                        {week.days.map((day) => (
                          <div
                            key={day.dayNumber}
                            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              day.isMilestone
                                ? "bg-amber-50/60 border-amber-200"
                                : "bg-slate-50/60 border-slate-200 hover:border-indigo-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                D{day.dayNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                                    {formatSkillLabel(day.skill)}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-400">
                                    {day.durationMins} phút
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-slate-900 mt-1">{day.title}</h5>
                              </div>
                            </div>

                            <Link
                              href={day.linkHref}
                              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-end sm:self-auto"
                            >
                              <Play size={12} fill="currentColor" /> Học Ngay
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
