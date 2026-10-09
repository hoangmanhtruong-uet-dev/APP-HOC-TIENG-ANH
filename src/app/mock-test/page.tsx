"use client";

import React, { useState, useEffect } from "react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import {
  Clock,
  EyeOff,
  Type,
  Flag,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MockTestPage() {
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 42); // 59:42
  const [leftWidth, setLeftWidth] = useState(50);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft < 10 * 60; // less than 10 mins

  // Drag resizer
  const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      let clientX = 0;
      if (moveEvent instanceof MouseEvent) {
        clientX = moveEvent.clientX;
      } else if (moveEvent instanceof TouchEvent) {
        clientX = moveEvent.touches[0].clientX;
      }
      const newWidth = (clientX / window.innerWidth) * 100;
      if (newWidth > 30 && newWidth < 70) {
        setLeftWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
  };

  const cycleFontSize = () => {
    setFontSize((prev) =>
      prev === "normal" ? "large" : prev === "large" ? "xlarge" : "normal"
    );
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F8FAFC] text-[#1E293B]">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-4">
          <AppLogo />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <h1 className="hidden text-sm font-semibold sm:block">
            IELTS Academic Mock 19 - Test 1
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-lg font-bold tracking-tight transition-colors",
              isLowTime ? "animate-pulse bg-red-100 text-red-600" : "text-slate-700"
            )}
          >
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="secondary"
              size="sm"
              onClick={cycleFontSize}
              title="Đổi cỡ chữ"
              className="gap-2"
            >
              <Type size={16} /> A±
            </Button>
            <Button variant="secondary" size="sm" className="gap-2">
              <EyeOff size={16} /> Ẩn bài thi
            </Button>
            <Button className="bg-[#4338CA] text-white hover:bg-[#3730A3]">
              NỘP BÀI THI
            </Button>
          </div>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Pane: Reading */}
        <div
          style={{ width: `${leftWidth}%` }}
          className={cn(
            "flex h-full flex-col overflow-y-auto bg-white p-6 shadow-inner sm:p-10",
            fontSize === "normal" && "text-base",
            fontSize === "large" && "text-lg",
            fontSize === "xlarge" && "text-xl"
          )}
        >
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-2xl font-bold">
              Reading Passage 1: The Secret of Trees
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="font-semibold">Paragraph A</p>
              <p className="mb-4 leading-relaxed">
                <span className="relative group cursor-text">
                  Trees communicate underground through a vast network of fungi
                  that connect their roots.
                  {/* Mock Annotation Tool */}
                  <span className="absolute -top-10 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-lg bg-slate-800 p-1 text-white shadow-xl group-hover:flex">
                    <button className="rounded p-1 hover:bg-slate-700">
                      <div className="h-4 w-4 rounded-full bg-yellow-300" />
                    </button>
                    <button className="rounded p-1 hover:bg-slate-700">
                      <div className="h-4 w-4 rounded-full bg-teal-300" />
                    </button>
                    <button className="rounded p-1 hover:bg-slate-700">
                      <div className="h-4 w-4 rounded-full bg-pink-300" />
                    </button>
                    <div className="mx-1 h-4 w-px bg-slate-600" />
                    <button className="rounded p-1 hover:bg-slate-700">
                      <StickyNote size={14} />
                    </button>
                  </span>
                </span>{" "}
                This network, often referred to as the "Wood Wide Web", allows
                trees to share resources and information. For example, older,
                more established trees, known as "hub trees" or "mother trees,"
                can share sugars with younger, shaded saplings that struggle to
                photosynthesize enough to survive.
              </p>
              <p className="mb-4 leading-relaxed">
                Furthermore, this underground connection acts as an early warning
                system. When a tree is attacked by insects, it can send chemical
                signals through the fungal network to neighboring trees. These
                neighbors then increase their own production of defensive
                chemicals, preparing themselves for the impending attack.
              </p>
              <p className="font-semibold">Paragraph B</p>
              <p className="mb-4 leading-relaxed">
                Ancient woodlands absorb significantly more carbon than newly
                planted forests. While young trees grow quickly and sequester
                carbon at a rapid rate, older forests have accumulated vast
                stores of carbon in their soils and biomass over centuries.
                Disturbing these ancient ecosystems can release enormous amounts
                of carbon dioxide back into the atmosphere, accelerating climate
                change.
              </p>
              <p className="mb-4 leading-relaxed">
                The role of fungi in this process is crucial. Mycorrhizal fungi
                form symbiotic relationships with tree roots, receiving sugars in
                exchange for providing the tree with essential nutrients like
                phosphorus and nitrogen scavenged from the soil.
              </p>
            </div>
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className="group flex w-2 cursor-col-resize items-center justify-center bg-slate-200 transition-colors hover:bg-slate-300 active:bg-slate-400"
          onMouseDown={startResizing}
          onTouchStart={startResizing}
        >
          <GripVertical className="h-6 w-4 text-slate-400 group-hover:text-slate-600" />
        </div>

        {/* Right Pane: Questions */}
        <div
          style={{ width: `${100 - leftWidth}%` }}
          className="flex h-full flex-col overflow-y-auto bg-[#F8FAFC] p-6 sm:p-10"
        >
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-slate-800">
                Questions 1–5: TRUE / FALSE / NOT GIVEN
              </h3>
              <p className="mb-6 text-sm text-slate-600">
                Do the following statements agree with the information given in
                Reading Passage 1?
              </p>

              <div className="space-y-8">
                {/* Q1 */}
                <div className="space-y-3">
                  <p className="flex gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
                      1
                    </span>
                    <span>
                      Ancient woodlands absorb more carbon than young ones.
                    </span>
                  </p>
                  <div className="ml-8 flex flex-col gap-2 sm:flex-row sm:gap-4">
                    {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-[#4338CA] has-[:checked]:border-[#4338CA] has-[:checked]:bg-[#EEF2FF]"
                      >
                        <input
                          type="radio"
                          name="q1"
                          value={opt}
                          className="h-4 w-4 border-slate-300 text-[#4338CA] focus:ring-[#4338CA]"
                        />
                        <span className="text-sm font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Q2 */}
                <div className="space-y-3">
                  <p className="flex gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
                      2
                    </span>
                    <span>
                      Fungal networks provide trees with nutrients in exchange
                      for defensive chemicals.
                    </span>
                  </p>
                  <div className="ml-8 flex flex-col gap-2 sm:flex-row sm:gap-4">
                    {["TRUE", "FALSE", "NOT GIVEN"].map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-[#4338CA] has-[:checked]:border-[#4338CA] has-[:checked]:bg-[#EEF2FF]"
                      >
                        <input
                          type="radio"
                          name="q2"
                          value={opt}
                          className="h-4 w-4 border-slate-300 text-[#4338CA] focus:ring-[#4338CA]"
                        />
                        <span className="text-sm font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer: Question Palette */}
      <footer className="flex shrink-0 flex-col border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="hidden gap-1 text-slate-600 sm:flex">
            <ChevronLeft size={16} /> Câu trước
          </Button>
          
          <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto px-4 pb-2 sm:pb-0 scrollbar-thin">
            {/* Mocking 40 questions palette */}
            {Array.from({ length: 40 }).map((_, i) => {
              const num = i + 1;
              const isAnswered = num === 1 || num === 3 || num === 12;
              const isFlagged = num === 5 || num === 18;
              const isActive = num === 1;

              return (
                <button
                  key={num}
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded border text-sm font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:ring-offset-1",
                    isAnswered
                      ? "border-[#4338CA] bg-[#4338CA] text-white"
                      : "border-slate-300 bg-white text-slate-700",
                    isActive && "ring-2 ring-[#4338CA] ring-offset-2"
                  )}
                >
                  {num}
                  {isFlagged && (
                    <Flag
                      size={10}
                      className={cn(
                        "absolute -right-1 -top-1",
                        isAnswered ? "text-red-400" : "text-red-500 fill-red-500"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              <Flag size={14} /> Đánh dấu
            </Button>
            <Button variant="ghost" className="gap-1 text-slate-600">
              Câu tiếp <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
