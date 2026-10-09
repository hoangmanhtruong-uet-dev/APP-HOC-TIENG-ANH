"use client";

import React from "react";
import { 
  Search, 
  Download, 
  Star, 
  Lock,
  Sparkles,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Thư viện Ebook & Tài liệu
            </h1>
            <p className="text-slate-500 mt-1">Hơn 500+ tài liệu độc quyền được biên soạn bởi chuyên gia</p>
          </div>
          
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm tài liệu, sách..." 
              className="w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
          <Button variant="secondary" className="gap-2 text-slate-600 bg-slate-50 hover:bg-slate-100">
            <Filter size={16} /> Tất cả kỹ năng
          </Button>
          <Button variant="secondary" className="gap-2 text-slate-600 bg-slate-50 hover:bg-slate-100">
            Target Band: 7.0+
          </Button>
          <Button variant="secondary" className="gap-2 text-slate-600 bg-slate-50 hover:bg-slate-100">
            Định dạng: PDF
          </Button>
        </div>
      </div>

      {/* Pro Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-white text-center sm:text-left">
            <h2 className="text-2xl font-bold flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="text-yellow-400" /> Nâng cấp PRO để mở khóa toàn bộ
            </h2>
            <p className="mt-2 text-indigo-100 max-w-xl">
              Tài khoản Free bị giới hạn 3 lượt tải/ngày. Thành viên PRO được tải không giới hạn, không bị đóng dấu watermark (logo) vào tài liệu, và nhận sớm tài liệu mới.
            </p>
          </div>
          <Button className="shrink-0 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold px-8 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            Nâng cấp ngay
          </Button>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Book Card 1 - Free */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
          {/* 3D Book Cover Mock */}
          <div className="relative mb-6 h-56 w-full flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden perspective-1000">
            <div className="absolute top-2 right-2 z-20 flex gap-1">
              <span className="rounded bg-indigo-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">PDF</span>
              <span className="rounded bg-amber-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">MP3</span>
            </div>
            
            <div className="relative h-48 w-36 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-y-12 transform-style-3d bg-gradient-to-br from-blue-600 to-indigo-800 rounded-r-md rounded-l-sm flex flex-col items-center p-4">
              <div className="absolute left-0 top-0 h-full w-2 bg-black/20" /> {/* Spine shadow */}
              <h3 className="text-white font-black text-center mt-4 leading-tight">IELTS<br/>Trainer 2</h3>
              <p className="text-blue-200 text-[10px] mt-auto">Academic & General</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-bold text-slate-800 line-clamp-2 mb-1">
              Tuyển tập IELTS Trainer 2 (Kèm Audio & Giải chi tiết)
            </h3>
            <div className="flex items-center gap-1 text-sm font-semibold text-yellow-500 mb-4">
              <Star size={14} className="fill-yellow-500" /> 4.9 <span className="text-slate-400 font-normal ml-1">(1.2k tải)</span>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">24.5 MB</span>
              <Button size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                <Download size={14} className="mr-1" /> Tải Xuống
              </Button>
            </div>
          </div>
        </div>

        {/* Book Card 2 - Locked Pro */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full relative">
          <div className="absolute top-0 right-0 p-3 z-30">
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1 text-xs font-bold text-yellow-900 shadow-sm">
              <Sparkles size={12} /> PRO
            </span>
          </div>
          
          {/* 3D Book Cover Mock */}
          <div className="relative mb-6 h-56 w-full flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden perspective-1000">
            <div className="absolute top-2 left-2 z-20 flex gap-1">
              <span className="rounded bg-indigo-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">PDF</span>
            </div>
            
            <div className="relative h-48 w-36 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-y-12 transform-style-3d bg-gradient-to-br from-emerald-600 to-teal-800 rounded-r-md rounded-l-sm flex flex-col items-center p-4">
              <div className="absolute left-0 top-0 h-full w-2 bg-black/20" />
              <h3 className="text-white font-black text-center mt-4 leading-tight text-xl">IDEA<br/>BANK</h3>
              <p className="text-emerald-200 text-[10px] mt-auto text-center">Writing Task 2 Band 8.0</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-bold text-slate-800 line-clamp-2 mb-1">
              Bộ Idea Bank Task 2 (100 Chủ Đề Hay Gặp)
            </h3>
            <div className="flex items-center gap-1 text-sm font-semibold text-yellow-500 mb-4">
              <Star size={14} className="fill-yellow-500" /> 5.0 <span className="text-slate-400 font-normal ml-1">(540 tải)</span>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">12.1 MB</span>
              <Button size="sm" variant="secondary" className="gap-2 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:border-indigo-200">
                <Lock size={14} /> Mở Khóa
              </Button>
            </div>
          </div>
        </div>

        {/* Book Card 3 - Anki Deck */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
          <div className="relative mb-6 h-56 w-full flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden perspective-1000">
            <div className="absolute top-2 right-2 z-20 flex gap-1">
              <span className="rounded bg-sky-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">ANKI</span>
            </div>
            
            <div className="relative h-40 w-48 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-3 transform-style-3d bg-white rounded-xl flex flex-col items-center justify-center p-4 border-4 border-sky-400">
              <span className="text-5xl mb-2">🧠</span>
              <h3 className="text-sky-700 font-black text-center leading-tight">Core 3000<br/>Vocab</h3>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="font-bold text-slate-800 line-clamp-2 mb-1">
              Bộ thẻ Anki 3000 Từ Vựng Lõi (Có hình ảnh & âm thanh)
            </h3>
            <div className="flex items-center gap-1 text-sm font-semibold text-yellow-500 mb-4">
              <Star size={14} className="fill-yellow-500" /> 4.8 <span className="text-slate-400 font-normal ml-1">(2.1k tải)</span>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">85 MB</span>
              <Button size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                <Download size={14} className="mr-1" /> Tải Xuống
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
