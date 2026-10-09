import type React from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface QuestionNavigationProps {
  totalQuestions: number;
  currentIndex: number;
  answeredQuestionIds: Set<string>;
  questionIds: string[];
  onSelectIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function QuestionNavigation({
  totalQuestions,
  currentIndex,
  answeredQuestionIds,
  questionIds,
  onSelectIndex,
  onPrev,
  onNext,
}: QuestionNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 shadow-md">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="gap-1 rounded-xl font-bold"
      >
        <ChevronLeft size={16} /> Previous
      </Button>

      <div className="flex max-w-[60vw] items-center gap-1.5 overflow-x-auto py-1 scrollbar-none sm:max-w-md">
        {questionIds.map((qId, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = answeredQuestionIds.has(qId);
          return (
            <button
              key={qId}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                isCurrent
                  ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600 ring-offset-2"
                  : isAnswered
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {idx + 1}
              {isAnswered && !isCurrent ? (
                <CheckCircle2
                  size={10}
                  className="absolute -right-0.5 -top-0.5 text-emerald-600"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={currentIndex === totalQuestions - 1}
        className="gap-1 rounded-xl font-bold"
      >
        Next <ChevronRight size={16} />
      </Button>
    </div>
  );
}
