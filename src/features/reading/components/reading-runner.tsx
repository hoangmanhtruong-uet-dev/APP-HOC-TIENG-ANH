"use client";

import { useCallback, useTransition } from "react";
import { Flag, Type, Highlighter, Moon, BookOpenText } from "lucide-react";

import { LessonMarkdown } from "@/features/learning/components/lesson-markdown";
import { GenericPracticeEngine } from "@/features/core-practice";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveReadingAnswerAction,
  submitReadingPracticeAction,
} from "@/features/reading/actions";
import { formatReadingQuestionType } from "@/features/reading/model";
import type {
  ReadingPracticePageData,
  ReadingQuestion,
} from "@/features/reading/server/content";

type Draft = { answerText: string; selectedOptionIds: string[] };

export function ReadingRunner({
  data,
  mockContext,
}: {
  data: ReadingPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  if (!data.attempt) return null;
  return <ActiveReadingRunner data={data} mockContext={mockContext} />;
}

function ActiveReadingRunner({
  data,
  mockContext,
}: {
  data: ReadingPracticePageData;
  mockContext?: MockRunnerContext;
}) {
  const attempt = data.attempt!;
  const [isSubmitting, startSubmitting] = useTransition();

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
    async (answers: Record<string, unknown>) => {
      let allOk = true;
      for (const question of data.questions) {
        const draft = answers[question.id] as Draft | undefined;
        if (!draft) continue;
        const result = await saveReadingAnswerAction({
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
          await submitReadingPracticeAction({
            attemptId: attempt.id,
            exerciseSlug: data.exercise.slug,
          });
        }
      });
    },
    [attempt.id, data.exercise.slug, mockContext],
  );

  const renderSidePanel = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
            title="Toggle Highlighter"
          >
            <Highlighter size={16} />
          </button>
          <button
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
            title="Toggle Dictionary"
          >
            <BookOpenText size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <button className="text-xs font-bold text-slate-500 hover:text-slate-800">
            Aa
          </button>
          <button className="text-xs font-bold text-slate-500 hover:text-slate-800 mx-2 font-serif">
            Serif
          </button>
          <button className="p-1 rounded bg-slate-200 text-slate-600">
            <Moon size={14} />
          </button>
        </div>
      </div>

      <article
        aria-labelledby="reading-passage-title"
        className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-thin scrollbar-thumb-slate-200"
      >
        <h2
          id="reading-passage-title"
          className="text-3xl font-black text-slate-800 text-pretty mb-2"
        >
          {data.passage.title}
        </h2>
        <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-wider">
          {data.passage.sourceName}
        </p>

        <div className="space-y-8 relative">
          {data.passage.sections.map((section, index) => {
            const paragraphLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
            return (
              <section key={section.id} className="relative group">
                <div className="absolute -left-12 top-0 mt-1 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 font-bold text-xs select-none group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                  [{paragraphLetters[index] || index + 1}]
                </div>

                {section.heading ? (
                  <h3 className="mb-4 text-xl font-bold text-slate-800 break-words">
                    {section.heading}
                  </h3>
                ) : null}

                <div className="leading-loose text-[17px] text-slate-700 font-medium font-serif text-justify selection:bg-emerald-200 selection:text-emerald-900">
                  <LessonMarkdown>{section.bodyMarkdown}</LessonMarkdown>
                </div>
              </section>
            );
          })}
        </div>
      </article>
    </div>
  );

  return (
    <GenericPracticeEngine
      title={data.exercise.title}
      domain="reading"
      categoryLabel="Reading Practice"
      serverNow={attempt.serverNow}
      expiresAt={attempt.expiresAt}
      questions={data.questions}
      initialAnswers={initialAnswers}
      isSubmitting={isSubmitting}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
      renderSidePanel={renderSidePanel}
      renderQuestionArea={({ currentQuestion, answers, setAnswer }) => {
        const question = currentQuestion as ReadingQuestion;
        const currentDraft = (answers[question.id] as Draft) || {
          answerText: "",
          selectedOptionIds: [],
        };
        const group = data.groups.find((g) => g.id === question.groupId);

        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            {group ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-900">
                  <Type size={100} />
                </div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">
                  {formatReadingQuestionType(group.type)}
                </p>
                <h2 className="text-xl font-black text-emerald-950 break-words mb-3 relative z-10">
                  {group.title}
                </h2>
                <div className="text-sm leading-relaxed text-emerald-800 font-medium relative z-10">
                  <LessonMarkdown>{group.instructionsMarkdown}</LessonMarkdown>
                </div>
              </div>
            ) : null}

            <QuestionCard
              question={question}
              draft={currentDraft}
              maxAnswerWords={group?.maxAnswerWords ?? null}
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
  maxAnswerWords,
  onChange,
}: {
  question: ReadingQuestion;
  draft: Draft;
  maxAnswerWords: number | null;
  onChange: (draft: Draft) => void;
}) {
  return (
    <fieldset
      id={`reading-question-${question.id}`}
      className="min-w-0 scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-6 md:p-8 relative overflow-hidden group shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <legend className="bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider px-3 py-1">
          Q{question.position}
        </legend>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const issue = prompt("Mô tả lỗi (sai đáp án, lỗi đánh máy...):");
              if (issue) {
                import("@/lib/telegram/actions").then((m) =>
                  m.reportIssueToTelegramAction(
                    issue,
                    `Reading Q${question.position} (${question.id})`,
                  ),
                );
                alert("Cảm ơn bạn đã báo lỗi!");
              }
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-700 bg-white border border-rose-100 hover:border-rose-200 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus-within:opacity-100"
            title="Báo lỗi câu hỏi này"
          >
            <Flag size={12} /> Báo lỗi
          </button>
        </div>
      </div>

      <div className="leading-relaxed font-semibold break-words text-slate-800 text-lg mb-6">
        <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
      </div>

      {question.type === "summary_completion" ? (
        <div className="mt-4">
          <label
            htmlFor={`reading-answer-${question.id}`}
            className="mb-2 block text-sm font-bold text-slate-600"
          >
            Your Answer
          </label>
          <input
            id={`reading-answer-${question.id}`}
            value={draft.answerText}
            onChange={(event) =>
              onChange({ ...draft, answerText: event.target.value })
            }
            maxLength={2000}
            autoComplete="off"
            placeholder="Type your answer here..."
            className="min-h-14 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 text-base focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-all outline-none"
          />
          {maxAnswerWords ? (
            <p className="mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Max {maxAnswerWords} words allowed
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {question.options.map((option) => {
            const checked = draft.selectedOptionIds.includes(option.id);
            const multiple = question.type === "multiple_choice";
            return (
              <label
                key={option.id}
                className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border px-5 py-3 transition-all duration-200 ${
                  checked
                    ? "border-emerald-600 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`reading-question-${question.id}`}
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
                  className="size-5 shrink-0 accent-emerald-600 cursor-pointer"
                />
                <span
                  className={`min-w-0 leading-relaxed break-words font-medium ${
                    checked ? "text-emerald-900" : "text-slate-700"
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
