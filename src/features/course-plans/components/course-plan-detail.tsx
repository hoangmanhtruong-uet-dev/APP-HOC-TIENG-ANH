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
      try {
        sessionStorage.setItem("active_course_plan", JSON.stringify(plan));
        // Also map to stage ID 1-6 for plans.enrolled in localStorage
        const stageMatch = plan.slug.match(/stage-(\d+)/);
        if (stageMatch) {
          localStorage.setItem("plans.enrolled", JSON.stringify(Number(stageMatch[1])));
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 space-y-10 pb-24 text-[#EEF0FF] animate-in fade-in duration-300">
      {/* Top Back Navigation */}
      <button
        onClick={() => router.push("/plans")}
        className="inline-flex items-center gap-2 text-xs font-bold text-[#98A0CF] hover:text-[#EEF0FF] transition-colors"
      >
        <ArrowLeft size={16} /> Trở về danh sách Lộ trình
      </button>

      {/* Hero Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141731] via-[#1B1F40] to-[#141731] border border-[#2B3060] p-8 sm:p-12 text-[#EEF0FF] shadow-2xl">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs font-bold text-[#EEF0FF] bg-[#5B5FEF]/20 px-3 py-1 rounded-full border border-[#5B5FEF]/30">
              {plan.durationWeeks} Tuần ({plan.totalDays} Ngày)
            </span>
            <span className="text-xs font-bold text-[#F6E85C] bg-[#F6E85C]/10 border border-[#F6E85C]/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Users size={14} /> {plan.enrolledLearnersCount.toLocaleString("vi-VN")} Học viên đang học
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight text-[#EEF0FF]">
              {plan.title}
            </h1>
            <p className="text-base sm:text-lg font-bold text-[#98A0CF] mt-2">{plan.subtitle}</p>
          </div>

          <p className="text-[#98A0CF] text-sm leading-relaxed max-w-3xl">{plan.description}</p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="bg-[#0C0E1D]/60 border border-[#2B3060] p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#98A0CF] uppercase block">
                Trình độ đầu vào
              </span>
              <span className="text-sm font-black text-[#EEF0FF]">{plan.startingLevel}</span>
            </div>
            <div className="bg-[#0C0E1D]/60 border border-[#2B3060] p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#98A0CF] uppercase block">
                Band điểm mục tiêu
              </span>
              <span className="text-sm font-black text-[#F6E85C]">{plan.targetBand}</span>
            </div>
            <div className="bg-[#0C0E1D]/60 border border-[#2B3060] p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#98A0CF] uppercase block">
                Thời lượng gợi ý
              </span>
              <span className="text-sm font-black text-[#5EE0A0]">
                {plan.recommendedDailyMins} phút/ngày
              </span>
            </div>
            <div className="bg-[#0C0E1D]/60 border border-[#2B3060] p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#98A0CF] uppercase block">
                Tỷ lệ hoàn thành
              </span>
              <span className="text-sm font-black text-[#7C80FF]">
                {plan.completionRatePercent}% thành công
              </span>
            </div>
          </div>

          {/* Activate Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={activatePlan}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                isActivated
                  ? "bg-[#5EE0A0] text-[#0C0E1D] shadow-[#5EE0A0]/20"
                  : "bg-[#F6E85C] hover:bg-[#F6E85C]/90 text-[#0C0E1D] shadow-[#F6E85C]/20 hover:scale-105"
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
              <p className="text-xs text-[#5EE0A0] font-bold flex items-center gap-1">
                <Check size={14} /> Hệ thống đã cập nhật bài học hàng ngày lên Dashboard & Roadmap của bạn.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Study Time Simulator */}
      <section className="bg-[#141731] rounded-3xl p-6 sm:p-8 border border-[#2B3060] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#7C80FF] uppercase tracking-wider block">
              AI Simulator
            </span>
            <h2 className="text-xl font-black text-[#EEF0FF] flex items-center gap-2">
              <Sparkles className="text-[#F6E85C]" size={20} /> Mô Phỏng Tốc Độ Học & Ngày Cán Đích
            </h2>
          </div>
          <span className="px-3 py-1 bg-[#5B5FEF]/20 text-[#EEF0FF] text-xs font-bold rounded-full border border-[#5B5FEF]/30">
            Realtime Projection
          </span>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-center bg-[#1B1F40] p-6 rounded-2xl border border-[#2B3060]">
          <div className="md:col-span-7 space-y-4">
            <label className="text-xs font-bold text-[#EEF0FF] flex justify-between">
              <span>Thời gian bạn học mỗi ngày:</span>
              <span className="text-[#F6E85C] font-black text-sm">{dailyMins} phút / ngày</span>
            </label>
            <input
              type="range"
              min={15}
              max={90}
              step={5}
              value={dailyMins}
              onChange={(e) => setDailyMins(Number(e.target.value))}
              className="w-full accent-[#F6E85C] cursor-pointer h-2 bg-[#0C0E1D] rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-bold text-[#98A0CF]">
              <span>15 phút (Thư thả)</span>
              <span>45 phút (Chuẩn)</span>
              <span>90 phút (Cấp tốc)</span>
            </div>
          </div>

          <div className="md:col-span-5 bg-[#141731] p-5 rounded-2xl border border-[#2B3060] shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#98A0CF] font-semibold">Dự kiến hoàn thành:</span>
              <span className="font-black text-[#7C80FF] text-sm">{calculatedDays} ngày</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#98A0CF] font-semibold">Ngày về đích:</span>
              <span className="font-black text-[#5EE0A0] text-sm">{formattedFinishDate}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#98A0CF] font-semibold">Xác suất đạt band:</span>
              <span className="font-black text-[#F6E85C] text-sm">
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
            <span className="text-[10px] font-bold text-[#98A0CF] uppercase tracking-wider block">
              Syllabus Matrix
            </span>
            <h2 className="text-2xl font-black text-[#EEF0FF]">
              Nội Dung Chi Tiết Theo Giai Đoạn & Tuần Học
            </h2>
          </div>
          <span className="text-xs font-bold text-[#98A0CF]">
            {plan.phases.length} Giai đoạn lớn
          </span>
        </div>

        {plan.phases.map((phase) => (
          <div
            key={phase.phaseNumber}
            className="bg-[#141731] rounded-3xl border border-[#2B3060] p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-start justify-between border-b border-[#2B3060] pb-4">
              <div>
                <span className="text-[11px] font-black uppercase text-[#EEF0FF] bg-[#5B5FEF] px-3 py-1 rounded-full">
                  Giai Đoạn {phase.phaseNumber}
                </span>
                <h3 className="text-xl font-extrabold text-[#EEF0FF] mt-2">{phase.title}</h3>
                <p className="text-xs text-[#98A0CF] mt-1 font-medium">
                  Mục tiêu: {phase.targetOutcome}
                </p>
              </div>
            </div>

            {/* Weeks Accordion */}
            <div className="space-y-4">
              {phase.weeks.map((week) => {
                const isExpanded = expandedWeek === week.weekNumber;
                return (
                  <div
                    key={week.weekNumber}
                    className="border border-[#2B3060] rounded-2xl overflow-hidden transition-all duration-200"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => setExpandedWeek(isExpanded ? 0 : week.weekNumber)}
                      className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                        isExpanded ? "bg-[#1B1F40]" : "hover:bg-[#1B1F40]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-[#5B5FEF] text-white font-black text-xs flex items-center justify-center">
                          W{week.weekNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-[#EEF0FF] text-sm">{week.title}</h4>
                          <p className="text-xs text-[#98A0CF]">{week.summary}</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-[#7C80FF]" />
                      ) : (
                        <ChevronDown size={20} className="text-[#98A0CF]" />
                      )}
                    </button>

                    {/* Accordion Days Body */}
                    {isExpanded && (
                      <div className="p-4 bg-[#0C0E1D]/50 border-t border-[#2B3060] space-y-3">
                        {week.days.map((day) => (
                          <div
                            key={day.dayNumber}
                            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              day.isMilestone
                                ? "bg-[#F6E85C]/10 border-[#F6E85C]/30"
                                : "bg-[#1B1F40] border-[#2B3060] hover:border-[#5B5FEF]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-[#141731] border border-[#2B3060] text-[#EEF0FF] font-bold text-xs flex items-center justify-center shrink-0">
                                D{day.dayNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F6E85C] bg-[#F6E85C]/15 px-2 py-0.5 rounded">
                                    {formatSkillLabel(day.skill)}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#98A0CF]">
                                    {day.durationMins} phút
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-[#EEF0FF] mt-1">
                                  {day.title}
                                </h5>
                              </div>
                            </div>

                            <Link
                              href={day.linkHref}
                              className="px-4 py-2 rounded-xl bg-[#5B5FEF] hover:bg-[#7C80FF] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-end sm:self-auto"
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
