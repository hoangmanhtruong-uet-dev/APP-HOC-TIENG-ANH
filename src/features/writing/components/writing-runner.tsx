"use client";

import { useCallback, useState, useTransition } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  RotateCcw,
  Target,
  Wand2,
} from "lucide-react";

import { GenericPracticeEngine } from "@/features/core-practice";
import { Button } from "@/components/ui/button";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveWritingDraftAction,
  submitWritingAction,
} from "@/features/writing/actions";
import type { WritingPracticePageData } from "@/features/writing/server/content";

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "offline"
  | "conflict"
  | "error";

export function WritingRunner({
  data,
  mockContext,
}: {
  data: WritingPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  const submission = data.submission;
  if (!submission) return null;
  return (
    <WritingEditor
      data={data}
      submission={submission}
      mockContext={mockContext}
    />
  );
}

function WritingEditor({
  data,
  submission,
  mockContext,
}: {
  data: WritingPracticePageData;
  submission: NonNullable<WritingPracticePageData["submission"]>;
  mockContext?: MockRunnerContext;
}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isSubmitting, startSubmitTransition] = useTransition();

  const handleSaveDraft = useCallback(
    async (answers: Record<string, unknown>) => {
      const textToSave = (answers["essay"] as string) || "";
      try {
        setSaveStatus("saving");
        const result = await saveWritingDraftAction({
          submissionId: submission.id,
          taskSlug: data.task.slug,
          draftText: textToSave,
          expectedRevision: submission.serverRevision,
        });
        if (result.status === "saved") {
          setSaveStatus("saved");
          return true;
        }
        setSaveStatus(result.status);
        return false;
      } catch {
        setSaveStatus("error");
        return false;
      }
    },
    [data.task.slug, submission.id, submission.serverRevision],
  );

  const handleSubmit = useCallback(
    async (answers: Record<string, unknown>) => {
      startSubmitTransition(async () => {
        if (mockContext) {
          await submitMockTestSectionAction({
            mockTestSlug: mockContext.mockTestSlug,
            sessionId: mockContext.sessionId,
            sectionAttemptId: mockContext.sectionAttemptId,
            idempotencyKey: crypto.randomUUID(),
          });
        } else {
          await submitWritingAction({
            submissionId: submission.id,
            taskSlug: data.task.slug,
            idempotencyKey: crypto.randomUUID(),
          });
        }
      });
    },
    [data.task.slug, mockContext, submission.id],
  );

  const questions = [
    {
      id: "essay",
      promptMarkdown: data.task.promptText,
    },
  ];

  const initialAnswers = {
    essay: submission.draftText,
  };

  const renderSidePanel = () => (
    <div className="flex flex-col h-full overflow-y-auto p-6 md:p-10 space-y-8 bg-white scrollbar-thin scrollbar-thumb-slate-200">
      <section>
        <h2 className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-sm mb-4">
          <Target size={18} className="text-indigo-500" /> Prompt & Requirements
        </h2>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-900 pointer-events-none">
            <FileText size={120} />
          </div>
          <p className="text-[15px] leading-relaxed text-indigo-950 font-medium relative z-10">
            {data.task.promptText}
          </p>

          <div className="mt-6 flex flex-wrap gap-2 relative z-10">
            <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm border border-indigo-100">
              {data.task.difficulty}
            </span>
            <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm border border-indigo-100">
              {data.task.minimumWords}-{data.task.maximumWords} words
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-indigo-100/50 relative z-10">
            <p className="text-xs leading-relaxed text-indigo-700/80 font-medium">
              {data.task.instructions}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-sm mb-4">
          <Wand2 size={18} className="text-amber-500" /> Idea Bank
        </h2>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-1 flex flex-col gap-1">
          <button className="w-full text-left px-5 py-4 bg-white rounded-xl shadow-sm border border-amber-100/50 flex items-center justify-between group hover:border-amber-300 transition-colors">
            <span className="font-bold text-slate-800 group-hover:text-amber-700">
              View Sample Outline
            </span>
            <HelpCircle size={16} className="text-amber-400 group-hover:text-amber-600" />
          </button>
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-sm mb-4">
          <BookOpen size={18} className="text-emerald-500" /> Topic Vocabulary
        </h2>
        <div className="flex flex-wrap gap-2">
          {["sustainable", "infrastructure", "mitigation", "ecosystem"].map(
            (word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold shadow-sm bg-white border-slate-200 text-slate-600"
              >
                <CheckCircle2 size={14} className="text-emerald-500" />
                {word}
              </span>
            ),
          )}
        </div>
      </section>
    </div>
  );

  return (
    <GenericPracticeEngine
      title={data.task.title}
      domain="writing"
      categoryLabel="Writing Practice"
      serverNow={submission.serverNow}
      expiresAt={submission.expiresAt}
      questions={questions}
      initialAnswers={initialAnswers}
      isSubmitting={isSubmitting}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
      renderSidePanel={renderSidePanel}
      renderQuestionArea={({ answers, setAnswer }) => {
        const text = (answers["essay"] as string) || "";
        const wordCount = countWords(text);

        return (
          <div className="flex-1 flex flex-col space-y-4">
            <section className="flex-1 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
              <label htmlFor="writing-draft" className="sr-only">
                Your writing
              </label>
              <textarea
                id="writing-draft"
                name="writingDraft"
                value={text}
                onChange={(event) => setAnswer("essay", event.target.value)}
                placeholder="Start typing your response here..."
                maxLength={20_000}
                autoComplete="off"
                spellCheck
                className="flex-1 min-h-[350px] w-full resize-none bg-transparent p-6 md:p-8 text-[17px] leading-loose text-slate-800 outline-none placeholder:text-slate-300 font-serif"
              />

              <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <div className="flex items-center gap-3 font-semibold text-xs">
                  <span
                    className={
                      wordCount >= data.task.minimumWords
                        ? "text-emerald-700"
                        : "text-slate-600"
                    }
                  >
                    {wordCount} / {data.task.wordTarget} words
                  </span>
                </div>
              </div>
            </section>

            {saveStatus === "conflict" || saveStatus === "error" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => window.location.reload()}
              >
                <RotateCcw aria-hidden="true" size={15} className="mr-2" />
                Reload Draft
              </Button>
            ) : null}
          </div>
        );
      }}
    />
  );
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}
