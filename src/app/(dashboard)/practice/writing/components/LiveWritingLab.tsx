"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Layers,
  BookOpen,
} from "lucide-react";
import {
  PARAPHRASE_DRILLS,
  COHESIVE_DEVICES_MATRIX,
  type ParaphraseDrill,
  type CohesiveDevice,
} from "./writing-curated-data";

export function LiveWritingLab() {
  const [activeTab, setActiveTab] = useState<"paraphrase" | "cohesion" | "lexicon">("paraphrase");
  const [selectedDrill, setSelectedDrill] = useState<ParaphraseDrill>(PARAPHRASE_DRILLS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const academicSwaps = [
    { weak: "good", academic: "advantageous / beneficial / commendable", note: "Tránh dùng 'good' chung chung trong luận điểm Task 2" },
    { weak: "bad", academic: "detrimental / adverse / deleterious", note: "Tạo sắc thái học thuật khi nói về tác hại môi trường/sức khỏe" },
    { weak: "a lot of", academic: "a substantial proportion of / an array of", note: "Dùng để diễn đạt số lượng lớn trong Task 1 và Task 2" },
    { weak: "show", academic: "illustrate / delineate / elucidate", note: "Bắt buộc đổi từ cho câu mở đầu Task 1 Report" },
    { weak: "big problem", academic: "pressing conundrum / acute challenge", note: "Nâng band phần nêu thực trạng xã hội" },
  ];

  return (
    <div className="rounded-2xl border border-[#242A4E] bg-[#12162B] p-5 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242A4E] pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-[#A855F7] animate-pulse" />
            <h3 className="font-extrabold text-base sm:text-lg text-[#EEF0FF] tracking-tight">
              Academic Syntax & Cohesion Lab
            </h3>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Trạm rèn kỹ thuật Paraphrase câu phức, ma trận liên từ học thuật và thay thế từ vựng Band 8.0+.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex rounded-xl bg-[#0C0E1D] p-1 border border-[#1E2442] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("paraphrase")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "paraphrase"
                ? "bg-[#5B5FEF] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#EEF0FF]"
            }`}
          >
            Paraphrase Forge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cohesion")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "cohesion"
                ? "bg-[#5B5FEF] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#EEF0FF]"
            }`}
          >
            Cohesion Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lexicon")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "lexicon"
                ? "bg-[#5B5FEF] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#EEF0FF]"
            }`}
          >
            Lexicon Swap
          </button>
        </div>
      </div>

      {/* Tab 1: Paraphrase Forge */}
      {activeTab === "paraphrase" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PARAPHRASE_DRILLS.map((drill) => (
              <button
                key={drill.id}
                type="button"
                onClick={() => setSelectedDrill(drill)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedDrill.id === drill.id
                    ? "border-[#5B5FEF] bg-[#1E2442] shadow-sm"
                    : "border-[#1E2442] bg-[#0C0E1D]/60 hover:border-[#2E3660]"
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-[#A855F7] uppercase">MẪU CÂU {drill.id.toUpperCase()}</span>
                <p className="text-xs font-bold text-[#EEF0FF] mt-0.5 line-clamp-1">{drill.originalSentence}</p>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[#0C0E1D] border border-[#1E2442] p-4 sm:p-5 space-y-4">
            <div>
              <span className="text-[11px] font-mono text-[#94A3B8] uppercase block mb-1">
                Original Prompt Sentence (Câu gốc trong đề bài):
              </span>
              <p className="text-sm font-semibold text-white bg-[#12162B] p-3 rounded-xl border border-[#242A4E]">
                &quot;{selectedDrill.originalSentence}&quot;
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Band 6 Attempt */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400">
                    BAND 6.0 ATTEMPT
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">Dịch thô theo từng từ</span>
                </div>
                <p className="text-xs text-[#EEF0FF] leading-relaxed">&quot;{selectedDrill.band6Attempt}&quot;</p>
              </div>

              {/* Band 8 Paraphrase */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 relative group">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                    BAND 8.0+ ACADEMIC PARAPHRASE
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedDrill.band8Paraphrase, selectedDrill.id)}
                    className="p-1 rounded text-[#94A3B8] hover:text-white"
                    aria-label="Sao chép câu Band 8"
                  >
                    {copiedId === selectedDrill.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-white font-medium leading-relaxed">&quot;{selectedDrill.band8Paraphrase}&quot;</p>
              </div>
            </div>

            <div className="text-xs text-[#94A3B8] border-t border-[#1E2442] pt-3">
              <strong className="text-[#00F0FF]">Kỹ thuật chuyển đổi: </strong>
              <span>{selectedDrill.technique}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cohesion Matrix */}
      {activeTab === "cohesion" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COHESIVE_DEVICES_MATRIX.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#242A4E] bg-[#0C0E1D] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#5B5FEF]/20 text-[#7A7DF5] border border-[#5B5FEF]/30">
                    {item.category} Linkers
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">BAND 8.0+ COHESION</span>
                </div>

                <div className="space-y-1 mb-2">
                  <span className="text-[11px] text-[#64748B]">Từ nối phổ thông:</span>
                  <p className="text-xs text-[#94A3B8] line-through">{item.commonLinkers.join(" · ")}</p>
                </div>

                <div className="space-y-1 mb-3">
                  <span className="text-[11px] text-[#00F0FF] font-bold">Nâng cấp học thuật:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.advancedBand8Linkers.map((linker, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1E2442] text-white border border-[#2E3660]">
                        {linker}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#1E2442] pt-2 text-[11px] text-[#94A3B8]">
                <span className="text-[#A5B4FC] font-semibold">Ví dụ: </span>
                <span>&quot;{item.exampleSentence}&quot;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Lexicon Swap */}
      {activeTab === "lexicon" && (
        <div className="space-y-2">
          {academicSwaps.map((swap, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#242A4E] bg-[#0C0E1D] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-500/10 text-rose-400 line-through border border-rose-500/20">
                  {swap.weak}
                </span>
                <ArrowRight size={14} className="text-[#64748B] shrink-0" />
                <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  {swap.academic}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] sm:max-w-md">{swap.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
