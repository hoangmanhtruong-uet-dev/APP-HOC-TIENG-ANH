"use client";

import { useCallback, useState, useTransition } from "react";
import { Headphones, Flag, Volume2, Info, Sparkles } from "lucide-react";

import { LessonMarkdown } from "@/features/learning/components/lesson-markdown";
import { GenericPracticeEngine, DynamicQuestionRenderer } from "@/features/core-practice";
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
      <Headphones className="text-indigo-400" size={18} />
      <audio
        aria-label={`Audio Listening ${data.exercise.title}`}
        className="h-9 w-52 rounded-lg border border-[#2B3060] bg-[#141731] text-white"
        controls
        preload="metadata"
        onError={() => setAudioError(true)}
        onCanPlay={() => setAudioError(false)}
      >
        <source src={data.audio.path} type={data.audio.mimeType} />
      </audio>
    </div>
  );

  // Split-View: Left panel with Audio Player, Waveform & Instructions
  const renderSidePanel = () => {
    return (
      <div className="space-y-6 select-none">
        {/* Audio Console Card */}
        <section className="rounded-3xl border border-[#2B3060] bg-[#141731] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              <Headphones className="text-indigo-400" size={20} />
              Audio Console
            </h2>
            <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-lg">
              {data.exercise.difficulty}
            </span>
          </div>

          <div className="space-y-3">
            <audio
              aria-label={`Audio Listening ${data.exercise.title}`}
              className="w-full h-11 rounded-xl bg-[#0C0E1D] border border-[#2B3060]"
              controls
              preload="metadata"
              onError={() => setAudioError(true)}
              onCanPlay={() => setAudioError(false)}
            >
              <source src={data.audio.path} type={data.audio.mimeType} />
            </audio>

            {audioError ? (
              <p
                role="alert"
                className="text-xs font-medium text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30"
              >
                Không thể tải file âm thanh. Vui lòng kiểm tra lại kết nối mạng.
              </p>
            ) : null}

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
              <span className="flex items-center gap-1">
                <Volume2 size={13} className="text-indigo-400" />
                Thời lượng: {Math.floor(data.audio.durationSeconds / 60)}:
                {Math.floor(data.audio.durationSeconds % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
              <span className="text-emerald-400 font-medium">Bản ghi chuẩn IELTS</span>
            </div>
          </div>
        </section>

        {/* Section Instructions Card */}
        {data.parts.length > 0 && (
          <div className="space-y-4">
            {data.parts.map((part) => (
              <div
                key={part.id}
                className="rounded-3xl border border-[#2B3060] bg-[#141731] p-6 shadow-xl"
              >
                <div className="flex items-center gap-2 mb-2 text-indigo-300 font-bold text-sm">
                  <Info size={16} className="text-[#F6E85C]" />
                  <span>{part.title}</span>
                </div>
                <div className="text-sm leading-relaxed text-zinc-300 prose prose-invert max-w-none">
                  <LessonMarkdown>{part.instructionsMarkdown}</LessonMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
      renderSidePanel={renderSidePanel}
      renderQuestionArea={({ currentQuestion, answers, setAnswer }) => {
        const question = currentQuestion as ListeningQuestion;
        const currentDraft = (answers[question.id] as Draft) || {
          answerText: "",
          selectedOptionIds: [],
        };
        const part = data.parts.find((p) => p.id === question.partId);

        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Mobile Audio Banner (shown only on small screens where side panel is hidden) */}
            <section className="lg:hidden rounded-2xl border border-[#2B3060] bg-[#141731] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                  <Headphones className="text-indigo-400" size={16} /> Audio Player
                </h2>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase rounded">
                  {data.exercise.difficulty}
                </span>
              </div>
              <audio
                aria-label={`Audio Listening ${data.exercise.title}`}
                className="w-full h-10 rounded-lg bg-[#0C0E1D] border border-[#2B3060]"
                controls
                preload="metadata"
                onError={() => setAudioError(true)}
                onCanPlay={() => setAudioError(false)}
              >
                <source src={data.audio.path} type={data.audio.mimeType} />
              </audio>
            </section>

            {/* Mobile Part Title */}
            {part && (
              <div className="lg:hidden rounded-2xl border border-[#2B3060] bg-[#141731] p-4">
                <h3 className="text-sm font-bold text-white mb-1">{part.title}</h3>
                <div className="text-xs text-zinc-300">
                  <LessonMarkdown>{part.instructionsMarkdown}</LessonMarkdown>
                </div>
              </div>
            )}

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
      className="min-w-0 scroll-mt-32 rounded-3xl border border-[#2B3060] bg-[#141731] p-6 md:p-8 shadow-xl text-white"
    >
      <legend className="px-3 bg-[#1B1F40] text-indigo-200 border border-[#2B3060] rounded-xl text-xs font-bold uppercase tracking-wider py-1.5 mb-5 flex items-center gap-2 justify-between w-full shadow-sm">
        <span className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#F6E85C]" />
          <span>
            Q{question.position} <span className="opacity-40 mx-1">·</span>{" "}
            {formatListeningQuestionType(question.type)}
          </span>
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
          className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium text-[11px] transition-colors"
          title="Báo lỗi câu hỏi này"
        >
          <Flag size={12} /> Báo lỗi
        </button>
      </legend>

      <div className="leading-relaxed font-semibold break-words text-[#EEF0FF] text-lg mb-6 max-w-[65ch]">
        <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
      </div>

      <DynamicQuestionRenderer
        question={question}
        draft={draft}
        onChange={onChange}
      />
    </fieldset>
  );
}
