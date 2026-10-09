"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Volume2,
  ChevronLeft,
  Settings2,
  Keyboard,
  Link2,
  BrainCircuit,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function VocabularyPage() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="rounded-full p-2 hover:bg-slate-100 transition-colors">
            <ChevronLeft size={20} className="text-slate-500" />
          </Link>
          <h1 className="hidden text-sm font-bold uppercase tracking-wider text-slate-700 sm:block">
            Sổ Từ Vựng & Flashcard
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <select className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium outline-none sm:block">
            <option>Tất cả từ vựng</option>
            <option>Chủ đề: Môi trường</option>
          </select>
          <select className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium outline-none sm:block">
            <option>Band 7.0+</option>
            <option>Band 6.0+</option>
          </select>
          
          <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-bold text-orange-600">
            Mục tiêu: 18/30 từ
            <Flame size={16} className="text-orange-500 fill-orange-500" />
          </div>
          
          <Button variant="ghost" size="icon" className="text-slate-500">
            <Settings2 size={20} />
          </Button>
        </div>
      </header>

      {/* Brain Retention Bar */}
      <div className="flex h-1.5 w-full bg-slate-200">
        <div className="h-full bg-emerald-500" style={{ width: "40%" }} title="Mastered (40%)" />
        <div className="h-full bg-amber-400" style={{ width: "35%" }} title="Learning (35%)" />
        <div className="h-full bg-slate-300" style={{ width: "25%" }} title="New (25%)" />
      </div>

      <main className="relative flex flex-1 flex-col items-center justify-center p-4">
        {/* Modes Toggle */}
        <div className="absolute top-6 flex gap-2">
          <Button variant="secondary" className="gap-2 bg-white text-indigo-600 shadow-sm hover:bg-indigo-50">
            <RotateCcw size={16} /> Lật thẻ
          </Button>
          <Button variant="ghost" className="gap-2 text-slate-500 hover:bg-white">
            <Keyboard size={16} /> Nghe - Gõ
          </Button>
          <Button variant="ghost" className="gap-2 text-slate-500 hover:bg-white">
            <Link2 size={16} /> Ghép cặp
          </Button>
        </div>

        {/* 3D Flashcard */}
        <div 
          className="group relative h-[420px] w-full max-w-lg cursor-pointer [perspective:1000px] mt-12"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div 
            className={cn(
              "absolute h-full w-full rounded-3xl transition-all duration-500 [transform-style:preserve-3d] shadow-xl",
              isFlipped && "[transform:rotateY(180deg)]"
            )}
          >
            {/* Front */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center [backface-visibility:hidden]">
              <button 
                className="absolute right-6 top-6 rounded-full bg-indigo-50 p-3 text-indigo-600 transition-colors hover:bg-indigo-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Volume2 size={24} />
              </button>
              
              <h2 className="mb-2 text-5xl font-black text-slate-800 tracking-tight">Ubiquitous</h2>
              <p className="mb-8 font-mono text-lg text-slate-500">/juːˈbɪk.wə.təs/ (adj)</p>
              
              <div className="w-full rounded-xl bg-slate-50 p-6">
                <p className="text-lg font-medium text-slate-700">
                  "Smartphones have become <span className="inline-block w-24 border-b-2 border-slate-300 bg-slate-200 text-transparent">ubiquitous</span> in daily life."
                </p>
                <p className="mt-4 text-sm font-semibold text-slate-400 uppercase tracking-widest">
                  Nhấp để lật thẻ
                </p>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 flex flex-col rounded-3xl border border-slate-200 bg-white p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Ubiquitous</h2>
                  <p className="text-lg font-bold text-indigo-600 mt-1">Có mặt ở khắp mọi nơi</p>
                </div>
                <button 
                  className="rounded-full bg-indigo-50 p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Volume2 size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {/* AI generated context image placeholder */}
                <div className="mb-6 flex h-32 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-50">
                  <span className="flex items-center gap-2 font-medium text-indigo-800">
                    <BrainCircuit size={20} />
                    [AI Image: Người người cầm điện thoại khắp thế giới]
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-bold uppercase text-slate-400">Collocations</h4>
                  <ul className="list-inside list-disc space-y-1 text-slate-700">
                    <li>ubiquitous feature</li>
                    <li>ubiquitous presence</li>
                    <li>virtually ubiquitous</li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-bold uppercase text-slate-400">Ví dụ (Cam 17)</h4>
                  <p className="rounded-lg bg-slate-50 p-3 text-slate-700 border-l-4 border-indigo-500">
                    "Smartphones have become <span className="font-bold text-indigo-600">ubiquitous</span> in daily life."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 SRS Buttons */}
        <div className={cn(
          "mt-12 flex w-full max-w-2xl justify-center gap-3 sm:gap-4 transition-opacity duration-300",
          isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          <button className="flex flex-1 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-3 text-red-700 transition-colors hover:bg-red-100 active:scale-95">
            <span className="text-lg font-bold">Lặp lại</span>
            <span className="text-xs font-medium text-red-500">&lt;1 phút</span>
          </button>
          
          <button className="flex flex-1 flex-col items-center justify-center rounded-xl border border-orange-200 bg-orange-50 py-3 text-orange-700 transition-colors hover:bg-orange-100 active:scale-95">
            <span className="text-lg font-bold">Khó</span>
            <span className="text-xs font-medium text-orange-500">10 phút</span>
          </button>
          
          <button className="flex flex-1 flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-emerald-700 transition-colors hover:bg-emerald-100 active:scale-95">
            <span className="text-lg font-bold">Tốt</span>
            <span className="text-xs font-medium text-emerald-500">1 ngày</span>
          </button>
          
          <button className="flex flex-1 flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 py-3 text-blue-700 transition-colors hover:bg-blue-100 active:scale-95">
            <span className="text-lg font-bold">Dễ</span>
            <span className="text-xs font-medium text-blue-500">4 ngày</span>
          </button>
        </div>
      </main>
    </div>
  );
}
