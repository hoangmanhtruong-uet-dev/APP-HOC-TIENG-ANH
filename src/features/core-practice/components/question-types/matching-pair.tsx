"use client";

import { useState } from "react";

interface MatchingPairProps {
  questionId: string;
  prompt: string;
  options: string[]; // e.g., ["A. Dog", "B. Cat"]
  targets: string[]; // e.g., ["1. Bark", "2. Meow"]
  selectedAnswer?: Record<string, string>; // e.g., { "A. Dog": "1. Bark" }
  onChange: (value: Record<string, string>) => void;
}

export function MatchingPair({
  questionId,
  prompt,
  options,
  targets,
  selectedAnswer = {},
  onChange,
}: MatchingPairProps) {
  const [activeOption, setActiveOption] = useState<string | null>(null);

  const handleOptionClick = (opt: string) => {
    if (activeOption === opt) {
      setActiveOption(null); // deselect
    } else {
      setActiveOption(opt);
    }
  };

  const handleTargetClick = (target: string) => {
    if (activeOption) {
      // Create new answer mapping
      const newAns = { ...selectedAnswer };
      
      // Remove any existing mapping for this target to keep it 1-to-1
      Object.keys(newAns).forEach(key => {
        if (newAns[key] === target) {
          delete newAns[key];
        }
      });
      
      // Set new pairing
      newAns[activeOption] = target;
      
      onChange(newAns);
      setActiveOption(null); // reset selection
    } else {
      // If clicking target without option, maybe they want to clear it
      const newAns = { ...selectedAnswer };
      let changed = false;
      Object.keys(newAns).forEach(key => {
        if (newAns[key] === target) {
          delete newAns[key];
          changed = true;
        }
      });
      if (changed) onChange(newAns);
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
        {prompt}
      </h4>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nhấn chọn một mục ở cột trái, sau đó chọn mục tương ứng ở cột phải để nối.
      </p>
      
      <div className="grid grid-cols-2 gap-8 mt-4">
        {/* Left Column - Options */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Cột A</h5>
          {options.map((opt) => {
            const isSelected = activeOption === opt;
            const isMatched = !!selectedAnswer[opt];
            
            return (
              <button
                key={opt}
                onClick={() => handleOptionClick(opt)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/50"
                    : isMatched
                      ? "border-green-500/50 bg-green-50/50 dark:bg-green-900/10 text-zinc-500"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-blue-300"
                }`}
              >
                {opt}
                {isMatched && (
                  <div className="mt-2 text-xs font-semibold text-green-600 dark:text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Đã nối với: {selectedAnswer[opt]}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column - Targets */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Cột B</h5>
          {targets.map((target) => {
            const isMatched = Object.values(selectedAnswer).includes(target);
            const isInteractive = activeOption !== null || isMatched;
            
            return (
              <button
                key={target}
                onClick={() => handleTargetClick(target)}
                disabled={!isInteractive}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isMatched
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : activeOption
                      ? "border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50 cursor-pointer border-dashed"
                      : "border-zinc-100 dark:border-zinc-800/50 opacity-60 cursor-not-allowed"
                }`}
              >
                {target}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
