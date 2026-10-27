"use client";

import React from "react";
import { Check, HelpCircle } from "lucide-react";
import type { QuestionOption } from "./true-false-button-group";

export interface MatchingPillSelectorProps {
  questionId: string;
  options: QuestionOption[];
  selectedOptionIds: string[];
  answerText?: string;
  onChange: (draft: { answerText: string; selectedOptionIds: string[] }) => void;
}

export function MatchingPillSelector({
  questionId,
  options,
  selectedOptionIds,
  answerText = "",
  onChange
}: MatchingPillSelectorProps) {
  // Option letter helper (e.g. "A", "B", "C")
  const getOptionLetter = (opt: QuestionOption, index: number) => {
    const match = opt.label.match(/^([A-Z])[\.\:\s]/i);
    if (match) return match[1].toUpperCase();
    return String.fromCharCode(65 + index);
  };

  const getOptionText = (opt: QuestionOption) => {
    return opt.label.replace(/^[A-Z][\.\:\s]+/i, "").trim();
  };

  const selectedOption = options.find((opt) => selectedOptionIds.includes(opt.id));

  const handleSelect = (opt: QuestionOption, letter: string) => {
    onChange({
      answerText: letter,
      selectedOptionIds: [opt.id]
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Reference Options Box */}
      {options.length > 0 && (
        <div className="rounded-2xl border border-[#2B3060] bg-[#141731]/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <HelpCircle size={14} className="text-[#F6E85C]" />
            Khung phương án phân loại:
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt, idx) => {
              const letter = getOptionLetter(opt, idx);
              const text = getOptionText(opt);
              const isSelected = selectedOptionIds.includes(opt.id);

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt, letter)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                    isSelected
                      ? "bg-indigo-600/25 border-indigo-500/60 text-white"
                      : "bg-[#1B1F40]/60 border-[#2B3060]/70 text-zinc-300 hover:bg-[#1B1F40] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                      isSelected
                        ? "bg-[#F6E85C] text-[#0C0E1D]"
                        : "bg-[#2B3060] text-indigo-200"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="font-medium leading-relaxed pt-0.5">{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 1-Touch Pill Selection Row */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-2">
          Chọn phương án tương ứng cho câu hỏi này:
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {options.map((opt, idx) => {
            const letter = getOptionLetter(opt, idx);
            const isSelected = selectedOptionIds.includes(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt, letter)}
                aria-pressed={isSelected}
                aria-label={`Chọn phương án ${letter}`}
                className={`h-11 min-w-[3.5rem] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  isSelected
                    ? "bg-[#F6E85C] text-[#0C0E1D] border-[#F6E85C] shadow-lg shadow-[#F6E85C]/20 scale-105"
                    : "bg-[#141731] text-zinc-200 hover:text-white hover:bg-[#1B1F40] border-[#2B3060]"
                }`}
              >
                <span>{letter}</span>
                {isSelected && <Check size={14} strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {/* Selected Confirmation Banner */}
        {selectedOption && (
          <p className="text-xs text-indigo-300 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Đã chọn: <strong className="text-white">{selectedOption.label}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
