"use client";

import React, { useState } from "react";
import { ChevronDown, Check, X, BookmarkCheck } from "lucide-react";
import type { QuestionOption } from "./true-false-button-group";

export interface MatchingHeadingsSelectorProps {
  questionId: string;
  options: QuestionOption[];
  selectedOptionIds: string[];
  answerText?: string;
  onChange: (value: { selectedOptionIds: string[]; answerText: string }) => void;
}

export function MatchingHeadingsSelector({
  questionId,
  options,
  selectedOptionIds,
  answerText,
  onChange,
}: MatchingHeadingsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => selectedOptionIds.includes(o.id));

  const handleSelectOption = (opt: QuestionOption) => {
    onChange({
      selectedOptionIds: [opt.id],
      answerText: opt.label,
    });
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      selectedOptionIds: [],
      answerText: "",
    });
  };

  return (
    <div className="mt-4 space-y-3 relative">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Chọn tiêu đề phù hợp (Heading):
      </label>

      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex min-h-14 w-full items-center justify-between rounded-2xl border-2 px-5 py-3 transition-all duration-150 cursor-pointer text-left ${
          selectedOption
            ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 shadow-sm"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          {selectedOption ? (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <BookmarkCheck size={16} />
            </div>
          ) : (
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">
              ?
            </span>
          )}
          <span className="font-semibold text-sm truncate">
            {selectedOption ? selectedOption.label : "-- Chọn tiêu đề từ danh sách --"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedOption && (
            <span
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              title="Xóa lựa chọn"
            >
              <X size={15} />
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Danh sách Headings ({options.length})
          </div>

          <div className="py-1 space-y-1">
            {options.map((opt) => {
              const isChecked = selectedOptionIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    isChecked
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="pr-4 leading-relaxed">{opt.label}</span>
                  {isChecked && <Check size={16} className="text-emerald-600 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
