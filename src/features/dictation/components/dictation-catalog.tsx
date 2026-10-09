"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mic,
  Headphones,
  Search,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import type { DictationDifficulty, DictationExercise } from "../model";

export function DictationCatalog({ items }: { items: DictationExercise[] }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) => {
    const matchesDifficulty =
      selectedDifficulty === "all" || item.difficulty === selectedDifficulty;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  const getDifficultyBadge = (difficulty: DictationDifficulty) => {
    switch (difficulty) {
      case "beginner":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
            Beginner (Cơ bản)
          </span>
        );
      case "intermediate":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
            Intermediate (Trung cấp)
          </span>
        );
      case "advanced":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-full border border-rose-200">
            Advanced (Nâng cao)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 p-8 sm:p-10 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Mic size={280} />
        </div>

        <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-amber-300" /> Dictation Practice Mode
            </div>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
              Luyện Nghe Chép Chính Tả <br />
              <span className="text-amber-200">Dictation Mastery</span>
            </h1>
            <p className="text-amber-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
              Phương pháp luyện phản xạ tai nghe 100% chính xác từng từ. Nghe câu ngắn, chép lại và nhận phản hồi chi tiết từ hệ thống so sánh từ vựng tự động.
            </p>
          </div>

          <div className="lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-200">Thống kê cá nhân</span>
              <Flame size={18} className="text-amber-300 fill-amber-300" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-black/20 rounded-xl p-3">
                <span className="block text-2xl font-black text-white">{items.length}</span>
                <span className="text-[11px] font-semibold text-amber-100">Bài dictation</span>
              </div>
              <div className="bg-black/20 rounded-xl p-3">
                <span className="block text-2xl font-black text-amber-300">95%</span>
                <span className="text-[11px] font-semibold text-amber-100">Độ chính xác trung bình</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Controls & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Difficulty Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Tất cả bài" },
            { id: "beginner", label: "Beginner" },
            { id: "intermediate", label: "Intermediate" },
            { id: "advanced", label: "Advanced" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDifficulty(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedDifficulty === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên bài hoặc chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. Dictation Exercise Catalog Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <article
            key={item.slug}
            className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-amber-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  {item.category}
                </span>
                {getDifficultyBadge(item.difficulty)}
              </div>

              <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-6">
                {item.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-6 text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Headphones size={15} className="text-amber-500" />
                  {item.sentences.length} câu chép chính tả
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-amber-500" />
                  ~{Math.ceil(item.durationSeconds / 60)} phút
                </span>
              </div>

              <Link
                href={`/practice/listening/dictation/${item.slug}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-700 transition-all group-hover:scale-[1.01]"
              >
                <span>Bắt đầu chép chính tả</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">Không tìm thấy bài dictation phù hợp.</p>
          <p className="text-xs text-slate-400 mt-1">Thử đổi từ khóa hoặc bộ lọc độ khó.</p>
        </div>
      )}
    </div>
  );
}
