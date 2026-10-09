"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import {
  PenTool,
  Mic,
  Coins,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Sparkles,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState<"writing" | "speaking">("writing");
  const [wordCount, setWordCount] = useState(268);
  const [isRecording, setIsRecording] = useState(false);

  const getWordCountColor = () => {
    if (wordCount < 150) return "text-red-500 bg-red-50";
    if (wordCount < 250) return "text-amber-500 bg-amber-50";
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Custom Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="rounded-full p-2 hover:bg-slate-100 transition-colors">
            <ChevronLeft size={20} className="text-slate-500" />
          </Link>
          <AppLogo />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <h1 className="hidden text-sm font-bold uppercase tracking-wider text-slate-500 sm:block">
            AI Practice Studio
          </h1>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2 px-4">
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("writing")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                activeTab === "writing"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <PenTool size={16} /> Luyện Viết
            </button>
            <button
              onClick={() => setActiveTab("speaking")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                activeTab === "speaking"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Mic size={16} /> Luyện Nói
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
            <Coins size={16} className="text-amber-500" />
            14 Credits
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {activeTab === "writing" ? (
          <>
            {/* Left: Writing Workspace */}
            <div className="flex w-3/5 flex-col border-r border-slate-200 bg-white">
              {/* Prompt Card */}
              <div className="border-b border-slate-100 bg-slate-50 p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
                    IELTS Writing Task 2
                  </span>
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-slate-500">⏱ 32:15</span>
                    <span className={cn("rounded-md px-2 py-1 transition-colors", getWordCountColor())}>
                      {wordCount} từ
                    </span>
                  </div>
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  The rise of artificial intelligence in modern education has sparked debate. Some believe it will replace teachers, while others think it is a valuable tool to enhance learning. Discuss both views and give your own opinion.
                </h2>
              </div>
              
              {/* Editor */}
              <div className="flex-1 p-6 overflow-y-auto">
                <textarea
                  className="h-full w-full resize-none bg-transparent text-lg leading-relaxed text-slate-700 placeholder:text-slate-300 focus:outline-none"
                  placeholder="Bắt đầu viết bài của bạn tại đây..."
                  defaultValue={"In recent years, the integration of artificial intelligence into educational systems has developed significantly. While a segment of society argues that AI might eventually render human educators obsolete, I personally believe it should be viewed as a pivotal instrument to augment the learning experience rather than a complete replacement.\n\nOn the one hand, those who advocate the replacement of teachers by AI argue based on efficiency and personalization. AI-driven platforms can process vast amounts of data to tailor educational content to the specific needs of each student..."}
                />
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
                <Button variant="ghost" className="text-slate-500 hover:text-red-600 gap-2">
                  <Trash2 size={18} /> Xóa bài
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-white">
                  Chấm bài với AI <ArrowRight size={18} />
                </Button>
              </div>
            </div>

            {/* Right: AI Live Feedback */}
            <div className="flex w-2/5 flex-col bg-slate-50 overflow-y-auto">
              <div className="p-6">
                <div className="mb-6 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-slate-400">
                    Band Dự Báo
                  </h3>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-indigo-500 bg-indigo-50">
                      <span className="text-3xl font-black text-indigo-700">6.5</span>
                    </div>
                  </div>
                  
                  {/* Criteria Grid */}
                  <div className="mt-6 grid grid-cols-4 gap-2">
                    {[
                      { name: "TA", score: "7.0", color: "text-emerald-600" },
                      { name: "CC", score: "6.0", color: "text-amber-500" },
                      { name: "LR", score: "6.5", color: "text-indigo-500" },
                      { name: "GRA", score: "6.0", color: "text-amber-500" },
                    ].map((c) => (
                      <div key={c.name} className="flex flex-col items-center rounded-lg bg-slate-50 py-2">
                        <span className="text-xs font-bold text-slate-500">{c.name}</span>
                        <span className={cn("text-lg font-bold", c.color)}>{c.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                      <AlertTriangle size={18} className="text-amber-500" />
                      Phân tích tiêu chí
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-400" />
                          Lỗi lặp từ: "important" (dùng 5 lần)
                        </p>
                        <p className="text-sm text-slate-600">
                          👉 Gợi ý thay thế: <span className="font-semibold text-emerald-600">crucial, vital, pivotal</span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400" />
                          Câu chưa mượt: Đoạn 2 câu 3
                        </p>
                        <p className="text-sm text-slate-600 line-through mb-1">
                          AI can making students learn better.
                        </p>
                        <p className="text-sm font-semibold text-emerald-600">
                          AI can significantly enhance students' learning capabilities.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Band 8.0 Rewriter */}
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-md">
                    <div className="rounded-lg bg-white p-4">
                      <h4 className="mb-3 flex items-center gap-2 font-bold text-indigo-700">
                        <Sparkles size={18} />
                        Rewrite Band 8.0
                      </h4>
                      <p className="text-sm italic text-slate-600">
                        "Over the past decade, machine intelligence has dramatically transformed the pedagogical landscape. While detractors argue that algorithms may precipitate the obsolescence of human educators..."
                      </p>
                      <Button variant="ghost" className="mt-2 h-auto p-0 text-indigo-600 hover:text-indigo-700 hover:bg-transparent hover:underline">
                        Xem toàn bộ bài viết lại
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col items-center justify-center bg-slate-900 p-8 text-white">
            {/* Speaking Voice Lab */}
            <div className="mb-12 w-full max-w-2xl text-center">
              <span className="mb-4 inline-block rounded-full bg-slate-800 px-4 py-1.5 text-sm font-semibold text-indigo-300">
                Part 2: Describe a book you read that you found useful
              </span>
              <p className="text-lg text-slate-400">
                You should say: what it is, when you read it, why you think it is useful, and explain how you felt about it.
              </p>
            </div>

            {/* Audio Visualizer Mock */}
            <div className="mb-12 flex h-32 items-center justify-center gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 rounded-full bg-indigo-500 transition-all duration-150",
                    isRecording ? "animate-pulse" : "h-2"
                  )}
                  style={{
                    
                    height: isRecording ? `${Math.random() * 100 + 20}px` : '8px',
                    
                    opacity: Math.random() * 0.5 + 0.5
                  }}
                />
              ))}
            </div>

            {/* Mic Button */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "group relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300",
                isRecording
                  ? "bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)]"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              )}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />
              )}
              <Mic size={40} className={cn(isRecording && "animate-pulse")} />
            </button>
            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-slate-400">
              {isRecording ? "Đang ghi âm... Bấm để dừng" : "Bấm để bắt đầu nói"}
            </p>

            {/* Real-time Subtitles */}
            <div className="mt-16 w-full max-w-3xl rounded-xl bg-slate-800/50 p-6 backdrop-blur-md">
              <p className="text-center text-lg leading-relaxed">
                <span className="text-emerald-400">The book I would like to</span>{" "}
                <span className="border-b-2 border-yellow-400 text-yellow-400" title="Stress mistake">describe</span>{" "}
                <span className="text-emerald-400">is Atomic Habits by James Clear. I read it</span>{" "}
                <span className="border-b-2 border-red-400 text-red-400" title="Pronunciation error">about</span>{" "}
                <span className="text-emerald-400">two years ago when I was struggling with...</span>
              </p>
              
              {/* Metrics */}
              <div className="mt-8 flex justify-center gap-8 border-t border-slate-700 pt-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-white">124</div>
                  <div className="text-xs uppercase text-slate-400">Từ / Phút (WPM)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-400">3</div>
                  <div className="text-xs uppercase text-slate-400">Ngập ngừng (s)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-red-400">5</div>
                  <div className="text-xs uppercase text-slate-400">Từ đệm (uh, um)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
