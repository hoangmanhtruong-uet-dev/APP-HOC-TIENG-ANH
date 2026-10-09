"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, X, Save, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BaseQuestion, PracticeRunnerProps } from "../model/types";
import { usePracticeTimer } from "../model/use-practice-timer";
import { useAutosaveDraft } from "../model/use-autosave-draft";
import { QuestionNavigation } from "./question-navigation";
import { SubmitConfirmModal } from "./submit-confirm-modal";

export function GenericPracticeEngine<
  TQuestion extends BaseQuestion,
  TAnswers extends Record<string, unknown> = Record<string, unknown>,
>({
  title,
  domain,
  categoryLabel,
  serverNow,
  expiresAt,
  durationMinutes = 20,
  questions,
  initialAnswers = {} as Partial<TAnswers>,
  isSubmitting = false,
  onSaveDraft,
  onSubmit,
  backHref,
  renderQuestionArea,
  renderSidePanel,
  renderTopHeaderExtra,
  renderFooterExtra,
}: PracticeRunnerProps<TQuestion, TAnswers>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<TAnswers>(
    () => initialAnswers as TAnswers,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Timer logic
  const defaultExpires = useMemo(() => {
    if (expiresAt) return expiresAt;
    const now = serverNow ? new Date(serverNow) : new Date();
    return new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
  }, [expiresAt, serverNow, durationMinutes]);

  const defaultServerNow = useMemo(
    () => serverNow || new Date().toISOString(),
    [serverNow],
  );

  const { remainingSeconds } = usePracticeTimer(
    defaultServerNow,
    defaultExpires,
  );

  // Autosave logic
  const { saveStatus } = useAutosaveDraft(answers, onSaveDraft);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);

  const answeredQuestionIds = useMemo(() => {
    const set = new Set<string>();
    Object.entries(answers).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        set.add(key);
      }
    });
    return set;
  }, [answers]);

  const currentQuestion = questions[currentIndex];

  const handleSetAnswer = (id: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    await onSubmit(answers);
  };

  const defaultBackHref = backHref || `/practice/${domain}`;

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-slate-50 font-sans">
      {/* HEADER */}
      <header className="z-40 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href={defaultBackHref}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={20} />
          </Link>
          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:block">
              {categoryLabel || `${domain.toUpperCase()} PRACTICE`}
            </p>
            <h1 className="max-w-[200px] truncate text-sm font-bold text-slate-800 sm:max-w-md sm:text-base">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Optional header extras like Audio Player */}
          {renderTopHeaderExtra ? renderTopHeaderExtra() : null}

          {/* Autosave status indicator */}
          {onSaveDraft ? (
            <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
              {saveStatus === "saving" ? (
                <Save size={14} className="animate-spin text-amber-500" />
              ) : saveStatus === "saved" ? (
                <Check size={14} className="text-emerald-500" />
              ) : null}
              <span className="font-semibold capitalize">{saveStatus}</span>
            </div>
          ) : null}

          {/* Countdown timer */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-700">
            <Clock3 size={16} />
            <span className="font-mono text-sm font-bold">
              {formatTimer(remainingSeconds)}
            </span>
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* Side Panel e.g. Reading passage split view */}
        {renderSidePanel ? (
          <div className="relative z-10 hidden w-1/2 flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
            {renderSidePanel()}
          </div>
        ) : null}

        {/* Question Area */}
        <main
          className={`flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-200 ${
            renderSidePanel ? "lg:w-1/2" : "w-full"
          }`}
        >
          {currentQuestion ? (
            renderQuestionArea({
              currentQuestion,
              currentIndex,
              answers,
              setAnswer: handleSetAnswer,
            })
          ) : (
            <div className="p-8 text-center text-slate-500">No questions available.</div>
          )}
          {renderFooterExtra ? renderFooterExtra() : null}
        </main>
      </div>

      {/* FOOTER QUESTION NAVIGATION */}
      {questions.length > 0 ? (
        <QuestionNavigation
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          answeredQuestionIds={answeredQuestionIds}
          questionIds={questionIds}
          onSelectIndex={setCurrentIndex}
          onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          onNext={() =>
            setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
          }
        />
      ) : null}

      {/* CONFIRM MODAL */}
      <SubmitConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        totalQuestions={questions.length}
        answeredCount={answeredQuestionIds.size}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}
