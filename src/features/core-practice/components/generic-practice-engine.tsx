"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ServerTimer } from "./server-timer";
import { SubmitConfirmModal } from "./submit-confirm-modal";
import { QuestionNavigator } from "./question-navigator";
import { useAutosaveDraft } from "../hooks/use-autosave-draft";
import { submitExerciseAction } from "../api/submit-attempt-action";
import { Loader2, Save } from "lucide-react";

export interface QuestionDefinition {
  id: string;
  order_index: number;
  question_type: string;
}

export interface GenericPracticeEngineProps {
  attemptId: string;
  serverExpiresAt: string | null;
  questions: QuestionDefinition[];
  initialAnswers?: Record<string, string | string[]>;
  children: (props: {
    currentQuestion: QuestionDefinition;
    answers: Record<string, string | string[]>;
    setAnswer: (questionId: string, value: string | string[]) => void;
  }) => React.ReactNode;
  contextContent?: React.ReactNode; // For reading passage or listening audio
}

export function GenericPracticeEngine({
  attemptId,
  serverExpiresAt,
  questions,
  initialAnswers = {},
  children,
  contextContent,
}: GenericPracticeEngineProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft autosave
  const { status: saveStatus, forceSave } = useAutosaveDraft({
    attemptId,
    answers,
    intervalMs: 15000,
  });

  const setAnswer = useCallback((questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleManualSave = () => {
    forceSave();
  };

  const unansweredCount = useMemo(() => {
    return questions.filter((q) => {
      const val = answers[q.id];
      return val === undefined || val === "" || (Array.isArray(val) && val.length === 0);
    }).length;
  }, [questions, answers]);

  const navQuestions = useMemo(() => {
    return questions.map((q, i) => {
      const val = answers[q.id];
      const hasAnswer = val !== undefined && val !== "" && (!Array.isArray(val) || val.length > 0);
      return {
        id: q.id,
        index: i,
        status: hasAnswer ? "answered" : "unanswered",
      } as const;
    });
  }, [questions, answers]);

  const submitAttempt = async () => {
    setIsSubmitting(true);
    await forceSave(); // ensure latest draft is saved

    const res = await submitExerciseAction({
      attemptId,
      answers,
    });

    if (res.success) {
      // Navigate to results page
      router.push(`/practice/result/${attemptId}`);
    } else {
      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
      alert(res.error || "Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
    }
  };

  const handleExpire = useCallback(() => {
    // Automatically submit when time is up
    submitAttempt();
  }, [attemptId, answers]); 

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full">
      {/* Sticky Top Bar */}
      <div className="flex-none bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <ServerTimer serverExpiresAt={serverExpiresAt} onExpire={handleExpire} />
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {saveStatus === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveStatus === "saved" && <span className="text-green-600 dark:text-green-500 flex items-center gap-1"><Save className="w-3.5 h-3.5"/> Đã lưu nháp</span>}
            {saveStatus === "error" && <span className="text-red-500">Lỗi lưu nháp</span>}
          </div>
          
          <button
            onClick={handleManualSave}
            className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Lưu nháp
          </button>
          
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            Nộp bài
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden grid lg:grid-cols-12 gap-6 p-4 md:p-6 bg-zinc-50 dark:bg-zinc-950">
        
        {/* Context / Passage Column */}
        {contextContent && (
          <div className="lg:col-span-6 h-full overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            {contextContent}
          </div>
        )}

        {/* Question Area Column */}
        <div className={`${contextContent ? "lg:col-span-4" : "lg:col-span-8"} h-full overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col`}>
          <div className="flex-1">
            {currentQuestion ? (
              children({ currentQuestion, answers, setAnswer })
            ) : (
              <div className="text-center text-zinc-500 mt-10">Không có câu hỏi nào.</div>
            )}
          </div>
          
          <div className="mt-8 flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((p) => p - 1)}
              className="px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Câu trước
            </button>
            <span className="text-sm font-medium text-zinc-500">
              {currentIndex + 1} / {questions.length}
            </span>
            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((p) => p + 1)}
              className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Câu tiếp
            </button>
          </div>
        </div>

        {/* Navigator Column */}
        <div className={`${contextContent ? "lg:col-span-2" : "lg:col-span-4"} h-full overflow-y-auto hidden lg:block`}>
          <QuestionNavigator
            questions={navQuestions}
            currentIndex={currentIndex}
            onSelectQuestion={setCurrentIndex}
          />
        </div>
      </div>

      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={submitAttempt}
        isSubmitting={isSubmitting}
        unansweredCount={unansweredCount}
      />
    </div>
  );
}
