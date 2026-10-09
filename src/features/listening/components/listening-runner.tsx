"use client";

import { useCallback, useState, useTransition } from "react";
import { Headphones, Flag } from "lucide-react";

import { LessonMarkdown } from "@/features/learning/components/lesson-markdown";
import { GenericPracticeEngine } from "@/features/core-practice";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveListeningAnswerAction,
  submitListeningPracticeAction,
} from "@/features/listening/actions";
import { formatListeningQuestionType } from "@/features/listening/model";
import type {
  ListeningPracticePageData,
  ListeningQuestion,
} from "@/features/listening/server/content";

type Draft = { answerText: string; selectedOptionIds: string[] };

export function ListeningRunner({
  data,
  mockContext,
}: {
  data: ListeningPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  if (!data.attempt) return null;
  return <ActiveListeningRunner data={data} mockContext={mockContext} />;
}

function ActiveListeningRunner({
  data,
  mockContext,
}: {
  data: ListeningPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  const attempt = data.attempt!;
  const [isSubmitting, startSubmitting] = useTransition();
  const [audioError, setAudioError] = useState(false);

  const initialAnswers = Object.fromEntries(
    data.questions.map((question) => [
      question.id,
      {
        answerText: question.answer?.text ?? "",
        selectedOptionIds: question.answer?.selectedOptionIds ?? [],
      },
    ]),
  );

  const handleSaveDraft = useCallback(
    async (answers: Record<string, any>) => {
      let allOk = true;
      for (const question of data.questions) {
        const draft = answers[question.id] as Draft | undefined;
        if (!draft) continue;
        const result = await saveListeningAnswerAction({
          attemptId: attempt.id,
          questionId: question.id,
          exerciseSlug: data.exercise.slug,
          selectedOptionIds: draft.selectedOptionIds,
          answerText: draft.answerText,
          clientRevision: (question.answer?.clientRevision ?? 0) + 1,
        });
        if (result.status !== "saved") {
          allOk = false;
        }
      }
      return allOk;
    },
    [attempt.id, data.exercise.slug, data.questions],
  );

  const handleSubmit = useCallback(
    async () => {
      startSubmitting(async () => {
        if (mockContext) {
          await submitMockTestSectionAction({
            mockTestSlug: mockContext.mockTestSlug,
            sessionId: mockContext.sessionId,
            sectionAttemptId: mockContext.sectionAttemptId,
            idempotencyKey: crypto.randomUUID(),
          });
        } else {
          await submitListeningPracticeAction({
            attemptId: attempt.id,
            exerciseSlug: data.exercise.slug,
          });
        }
      });
    },
    [attempt.id, data.exercise.slug, mockContext],
  );

  const renderTopHeaderExtra = () => (
    <div className="hidden items-center gap-2 md:flex">
      <Headphones className="text-indigo-500" size={18} />
      <audio
        aria-label={`Audio Listening ${data.exercise.title}`}
        className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50"
        controls
        preload="metadata"
        onError={() => setAudioError(true)}
        onCanPlay={() => setAudioError(false)}
      >
        <source src={data.audio.path} type={data.audio.mimeType} />
      </audio>
    </div>
  );

  return (
    <GenericPracticeEngine
      title={data.exercise.title}
      domain="listening"
      categoryLabel="Listening Practice"
      serverNow={attempt.serverNow}
      expiresAt={attempt.expiresAt}
      questions={data.questions}
      initialAnswers={initialAnswers}
      isSubmitting={isSubmitting}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
      renderTopHeaderExtra={renderTopHeaderExtra}
      renderQuestionArea={({ currentQuestion, answers, setAnswer }) => {
        const question = currentQuestion as ListeningQuestion;
        const currentDraft = (answers[question.id] as Draft) || {
          answerText: "",
          selectedOptionIds: [],
        };
        const part = data.parts.find((p) => p.id === question.partId);

        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Audio banner if on mobile or first question */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base tracking-tight text-zinc-900 flex items-center gap-2">
                  <Headphones className="text-indigo-500" size={18} /> Audio Player
                </h2>
                <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-widest rounded-md">
                  {data.exercise.difficulty}
                </span>
              </div>
              <audio
                aria-label={`Audio Listening ${data.exercise.title}`}
                className="w-full h-11 rounded-xl bg-zinc-50 border border-zinc-200/50"
                controls
                preload="metadata"
                onError={() => setAudioError(true)}
                onCanPlay={() => setAudioError(false)}
              >
                <source src={data.audio.path} type={data.audio.mimeType} />
              </audio>
              {audioError ? (
                <p role="alert" className="mt-3 text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  Could not load audio. Please check your connection.
                </p>
              ) : null}
            </section>

            {part ? (
              <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 shadow-sm">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 break-words mb-2">
                  {part.title}
                </h2>
                <div className="text-sm leading-relaxed text-zinc-600">
                  <LessonMarkdown>{part.instructionsMarkdown}</LessonMarkdown>
                </div>
              </div>
            ) : null}

            <QuestionCard
              question={question}
              draft={currentDraft}
              onChange={(next) => setAnswer(question.id, next)}
            />
          </div>
        );
      }}
    />
  );
}

function QuestionCard({
  question,
  draft,
  onChange,
}: {
  question: ListeningQuestion;
  draft: Draft;
  onChange: (draft: Draft) => void;
}) {
  return (
    <fieldset
      id={`listening-question-${question.id}`}
      className="min-w-0 scroll-mt-32 rounded-[2rem] border border-zinc-200/80 bg-white p-6 md:p-8 shadow-sm"
    >
      <legend className="px-3 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-widest py-1 mb-4 flex items-center gap-2 justify-between w-full">
        <span>
          Q{question.position} <span className="opacity-50 mx-1">·</span>{" "}
          {formatListeningQuestionType(question.type)}
        </span>
        <button
          type="button"
          onClick={() => {
            const issue = prompt("Mô tả lỗi (sai đáp án, lỗi đánh máy...):");
            if (issue) {
              import("@/lib/telegram/actions").then((m) =>
                m.reportIssueToTelegramAction(
                  issue,
                  `Listening Q${question.position} (${question.id})`,
                ),
              );
              alert("Cảm ơn bạn đã báo lỗi!");
            }
          }}
          className="text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
          title="Báo lỗi câu hỏi này"
        >
          <Flag size={12} /> Báo lỗi
        </button>
      </legend>
      <div className="leading-relaxed font-medium break-words text-zinc-900 text-[1.1rem] mb-6 max-w-[65ch]">
        <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
      </div>

      {question.type === "short_text" ? (
        <div className="mt-4">
          <label
            htmlFor={`listening-answer-${question.id}`}
            className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500"
          >
            Your Answer
          </label>
          <input
            id={`listening-answer-${question.id}`}
            name={`listening-answer-${question.id}`}
            value={draft.answerText}
            onChange={(event) =>
              onChange({ ...draft, answerText: event.target.value })
            }
            maxLength={2000}
            autoComplete="off"
            placeholder="Type your answer here..."
            className="min-h-[56px] w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-5 text-base focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all outline-none"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {question.options.map((option) => {
            const checked = draft.selectedOptionIds.includes(option.id);
            const multiple = question.type === "multiple_choice";
            return (
              <label
                key={option.id}
                className={`group flex min-h-[56px] cursor-pointer items-center gap-4 rounded-2xl border px-5 py-3 transition-all duration-300 ${
                  checked
                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`listening-question-${question.id}`}
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...draft,
                      selectedOptionIds: multiple
                        ? checked
                          ? draft.selectedOptionIds.filter(
                              (id) => id !== option.id,
                            )
                          : [...draft.selectedOptionIds, option.id]
                        : [option.id],
                    })
                  }
                  className="size-5 shrink-0 accent-indigo-600 cursor-pointer"
                />
                <span
                  className={`min-w-0 leading-relaxed break-words font-medium transition-colors ${
                    checked ? "text-indigo-950" : "text-zinc-700 group-hover:text-zinc-900"
                  }`}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
