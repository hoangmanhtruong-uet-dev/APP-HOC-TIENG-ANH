"use client";

import { Check } from "lucide-react";

type QuestionStatus = "unanswered" | "answered" | "review";

interface QuestionNavigatorProps {
  questions: { id: string; status: QuestionStatus; index: number }[];
  onSelectQuestion: (index: number) => void;
  currentIndex: number;
}

export function QuestionNavigator({
  questions,
  onSelectQuestion,
  currentIndex,
}: QuestionNavigatorProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sticky top-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Điều hướng câu hỏi
      </h3>
      
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q) => {
          const isActive = q.index === currentIndex;
          let bgColor = "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
          const icon = null;

          if (q.status === "answered") {
            bgColor = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400";
          } else if (q.status === "review") {
            bgColor = "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400";
          }

          if (isActive) {
            bgColor += " ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900";
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(q.index)}
              className={`relative flex items-center justify-center w-full aspect-square rounded-lg text-sm font-medium transition-all hover:opacity-80 ${bgColor}`}
            >
              {q.index + 1}
              {q.status === "answered" && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-6 flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"></div>
          <span>Chưa trả lời</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800"></div>
          <span>Đã trả lời</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800"></div>
          <span>Đánh dấu xem lại</span>
        </div>
      </div>
    </div>
  );
}
