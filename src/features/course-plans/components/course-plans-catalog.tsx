"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Users,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { getLevelBadge, type CoursePlan } from "../model";

export function CoursePlansCatalog({ plans }: { plans: CoursePlan[] }) {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePlanSlug, setActivePlanSlug] = useState<string>("stage-1-foundation");

  const filteredPlans = plans.filter((plan) => {
    const matchesLevel = selectedLevel === "all" || plan.level === selectedLevel;
    const matchesSearch =
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-violet-800 p-8 sm:p-12 text-white shadow-xl">
        <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
          <GraduationCap size={320} />
        </div>

        <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider text-indigo-200">
              <Sparkles size={14} className="text-amber-300" /> Course Plans & Pathways
            </div>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight">
              Lộ Trình Học Tập Chi Tiết <br />
              <span className="text-amber-300">Chuẩn Khảo Thí Quốc Tế</span>
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base max-w-2xl leading-relaxed">
              Các kế hoạch khóa học được thiết kế khoa học từng ngày, từng tuần. Tự động cá nhân hóa theo trình độ khởi điểm, thời gian rảnh và mục tiêu band điểm của bạn.
            </p>
          </div>

          {/* Active Plan Widget */}
          <div className="lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Lộ trình bạn đang học</span>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="bg-black/20 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-indigo-200 block">Nền Tảng Ngữ Âm & Từ Vựng</span>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Tiến độ: 40%</span>
                <span className="text-emerald-300 font-bold">4/10 tuần</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 rounded-full" style={{ width: "40%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Tất cả lộ trình" },
            { id: "stage_1", label: "Chặng 1 (0.0-2.5)" },
            { id: "stage_2", label: "Chặng 2 (2.5-3.5)" },
            { id: "stage_3", label: "Chặng 3 (3.5-4.5)" },
            { id: "stage_4", label: "Chặng 4 (4.5-5.5)" },
            { id: "stage_5", label: "Chặng 5 (5.5-6.5)" },
            { id: "stage_6", label: "Chặng 6 (6.5-7.0)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLevel(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedLevel === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên lộ trình hoặc mục tiêu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. Course Plans Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPlans.map((plan) => {
          const badge = getLevelBadge(plan.level);
          const isActive = activePlanSlug === plan.slug;

          return (
            <article
              key={plan.slug}
              className={`relative bg-white border rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                isActive ? "border-2 border-indigo-600 ring-4 ring-indigo-50" : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              {isActive && (
                <div className="absolute -top-3.5 right-6 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles size={12} /> Lộ Trình Đang Đăng Ký
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Clock size={14} className="text-indigo-500" />
                    {plan.durationWeeks} tuần
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-snug">{plan.title}</h3>
                  <p className="text-xs font-semibold text-indigo-600 mt-1">{plan.subtitle}</p>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{plan.description}</p>

                {/* Target & Workload Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Mục tiêu</span>
                    <span className="text-xs font-black text-slate-800">{plan.targetBand}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Thời lượng/ngày</span>
                    <span className="text-xs font-black text-indigo-600">{plan.recommendedDailyMins} phút/ngày</span>
                  </div>
                </div>

                {/* Highlights List */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Đặc quyền lộ trình:
                  </span>
                  {plan.highlights.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <Users size={14} className="text-indigo-500" />
                  {plan.enrolledLearnersCount.toLocaleString("en-US")} học viên
                </div>

                <Link
                  href={`/plans/${plan.slug}`}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all hover:scale-105"
                >
                  <span>Xem Chi Tiết</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">Không tìm thấy lộ trình phù hợp.</p>
          <p className="text-xs text-slate-400 mt-1">Hãy thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc trình độ khác.</p>
        </div>
      )}
    </div>
  );
}
