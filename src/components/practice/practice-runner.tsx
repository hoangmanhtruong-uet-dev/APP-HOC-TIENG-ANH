"use client";

import { CheckCircle2, Lightbulb, Save, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { LessonMarkdown } from "@/components/learning/lesson-markdown";
import { SubmitAttemptForm } from "@/components/practice/submit-attempt-form";
import { Button } from "@/components/ui/button";
import {
  savePracticeAnswerAction,
  startPracticeAction,
  type PracticeSaveState,
} from "@/features/practice/actions";
import { nextQuestionPosition } from "@/features/practice/model";
import type { PracticePageData } from "@/server/practice/content";

export function PracticeRunner({
  data,
  saved,
  error,
}: {
  data: PracticePageData;
  saved: boolean;
  error: string | undefined;
}) {
  if (!data.attempt) {
    return <PracticeStart data={data} error={error} />;
  }

  if (data.exercise.domain === "grammar") {
    return (
      <GrammarPracticeAttempt
        data={data as ActivePracticePageData}
        saved={saved}
        error={error}
      />
    );
  }

  return (
    <PracticeAttempt
      data={data as ActivePracticePageData}
      saved={saved}
      error={error}
    />
  );
}

function GrammarPracticeAttempt({
  data,
  saved,
  error,
}: {
  data: ActivePracticePageData;
  saved: boolean;
  error: string | undefined;
}) {
  const { activeQuestion, questions, attempt, exercise } = data;
  const [selectedOptionIds, setSelectedOptionIds] = useState(
    () => new Set(activeQuestion.answer?.selectedOptionIds ?? []),
  );
  const [answerText, setAnswerText] = useState(
    activeQuestion.answer?.text ?? "",
  );
  const [showHint, setShowHint] = useState(false);
  const initialSaveState: PracticeSaveState = { status: "idle" };
  const [saveState, saveAction] = useActionState(
    savePracticeAnswerAction,
    initialSaveState,
  );
  const revision = (activeQuestion.answer?.clientRevision ?? 0) + 1;
  const hasAnswer =
    activeQuestion.type === "short_text"
      ? answerText.trim().length > 0
      : selectedOptionIds.size > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl flex-col bg-[#fbf9ff] pb-24 lg:min-h-[43rem] lg:rounded-3xl lg:border lg:border-[#e4deef] lg:pb-0">
      <header className="flex h-14 items-center border-b border-[#e7e1ef] bg-white px-3 lg:rounded-t-3xl">
        <Link
          href="/learn/grammar"
          aria-label="Close practice"
          className="grid size-11 place-items-center rounded-full text-[#3020a6]"
        >
          <X size={19} />
        </Link>
        <p className="flex-1 text-center text-sm font-bold">
          Practice {String(activeQuestion.position).padStart(2, "0")}
        </p>
        <span className="w-11" />
      </header>

      <div className="px-5 pt-5">
        <div className="flex justify-between text-xs font-semibold text-[#625b6e]">
          <span>{exercise.difficulty}</span>
          <span>
            {activeQuestion.position} / {questions.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8e2ef]">
          <div
            className="h-full rounded-full bg-[#7b56ed]"
            style={{
              width: `${(activeQuestion.position / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <form action={saveAction} className="flex flex-1 flex-col px-5 py-7">
        <input type="hidden" name="attemptId" value={attempt.id} />
        <input type="hidden" name="questionId" value={activeQuestion.id} />
        <input type="hidden" name="exerciseSlug" value={exercise.slug} />
        <input type="hidden" name="clientRevision" value={revision} />
        <input
          type="hidden"
          name="currentPosition"
          value={activeQuestion.position}
        />
        <input type="hidden" name="checkAnswer" value="true" />
        <input
          type="hidden"
          name="nextPosition"
          value={nextQuestionPosition(
            activeQuestion.position,
            questions.length,
          )}
        />

        {error || saveState.status === "error" ? (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-[#ffe7e4] p-3 text-sm font-semibold text-[#a82d27]"
          >
            Could not save your answer. Please try again.
          </p>
        ) : null}
        {saved ? (
          <p
            role="status"
            className="mb-4 rounded-xl bg-[#e5fbef] p-3 text-sm font-semibold text-[#087849]"
          >
            Answer saved to PostgreSQL.
          </p>
        ) : null}

        <fieldset className="flex-1">
          <legend className="w-full rounded-2xl border border-[#e1dbea] bg-white px-5 py-8 text-center text-xl leading-8 font-bold">
            <LessonMarkdown>{activeQuestion.promptMarkdown}</LessonMarkdown>
          </legend>

          {!data.feedback ? (
            <button
              type="button"
              onClick={() => setShowHint((current) => !current)}
              className="mt-4 flex min-h-11 w-full items-center gap-2 rounded-xl bg-[#f0ebff] px-4 text-left text-xs font-semibold text-[#5234d4]"
            >
              <Lightbulb size={15} />
              {showHint
                ? "Remember: identify the subject before choosing the verb form."
                : "Show hint"}
            </button>
          ) : null}

          {activeQuestion.type === "short_text" ? (
            <input
              name="answerText"
              value={answerText}
              onChange={(event) => setAnswerText(event.currentTarget.value)}
              maxLength={2000}
              autoComplete="off"
              placeholder="Type your answer"
              disabled={Boolean(data.feedback)}
              className="mt-6 min-h-14 w-full rounded-xl border border-[#ddd6e7] bg-white px-4 text-base focus-visible:ring-2 focus-visible:ring-[#6848e2] focus-visible:outline-none"
            />
          ) : (
            <div
              className={
                activeQuestion.type === "multiple_choice"
                  ? "mt-6 flex min-h-32 flex-wrap content-start gap-2 rounded-2xl border border-[#e1dbea] bg-white p-4"
                  : "mt-6 space-y-3"
              }
            >
              {activeQuestion.options.map((option, index) => (
                <label
                  key={option.id}
                  className={`${activeQuestion.type === "multiple_choice" ? "inline-flex min-h-10" : "flex min-h-14"} items-center gap-3 rounded-xl border px-4 transition ${data.feedback?.correctOptionIds?.includes(option.id) ? "border-[#15966a] bg-[#dff8ed]" : data.feedback && selectedOptionIds.has(option.id) ? "border-[#e34d47] bg-[#fff0ee]" : selectedOptionIds.has(option.id) ? "border-[#6243dd] bg-white ring-1 ring-[#6243dd]" : "border-[#ddd6e7] bg-white"}`}
                >
                  <input
                    type={
                      activeQuestion.type === "multiple_choice"
                        ? "checkbox"
                        : "radio"
                    }
                    name="selectedOptionIds"
                    value={option.id}
                    checked={selectedOptionIds.has(option.id)}
                    disabled={Boolean(data.feedback)}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setSelectedOptionIds((current) => {
                        const next = new Set(current);
                        if (activeQuestion.type === "multiple_choice") {
                          if (checked) next.add(option.id);
                          else next.delete(option.id);
                        } else {
                          next.clear();
                          next.add(option.id);
                        }
                        return next;
                      });
                    }}
                    className="sr-only"
                  />
                  {activeQuestion.type === "multiple_choice" ? null : (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#d8d1e2] text-xs font-semibold text-[#635c6f]">
                      {String.fromCharCode(65 + index)}
                    </span>
                  )}
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {data.feedback ? (
          <div
            className={`mt-6 rounded-2xl p-4 ${data.feedback.isCorrect ? "bg-[#dff8ed] text-[#08754d]" : "bg-[#ffe1dd] text-[#a82924]"}`}
          >
            <p className="flex items-center gap-2 text-lg font-bold">
              {data.feedback.isCorrect ? (
                <CheckCircle2 size={21} />
              ) : (
                <XCircle size={21} />
              )}
              {data.feedback.isCorrect ? "Correct!" : "Not quite."}
            </p>
            {data.feedback.explanationMarkdown ? (
              <div className="mt-2 text-sm leading-6">
                <LessonMarkdown>
                  {data.feedback.explanationMarkdown}
                </LessonMarkdown>
              </div>
            ) : null}
            {!data.feedback.isCorrect &&
            data.feedback.acceptedTextAnswers?.length ? (
              <p className="mt-2 text-sm">
                Correct answer:{" "}
                <strong>{data.feedback.acceptedTextAnswers.join("; ")}</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        {data.feedback ? (
          activeQuestion.position < questions.length ? (
            <Link
              href={`/practice/${exercise.slug}?question=${activeQuestion.position + 1}`}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#4c31d4] font-bold text-white"
            >
              Continue →
            </Link>
          ) : null
        ) : (
          <GrammarCheckButton disabled={!hasAnswer} />
        )}
      </form>
      {data.feedback && activeQuestion.position === questions.length ? (
        <div className="px-5 pb-6">
          <SubmitAttemptForm
            attemptId={attempt.id}
            exerciseSlug={exercise.slug}
          />
        </div>
      ) : null}
    </div>
  );
}

function GrammarCheckButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      className="mt-7 min-h-12 w-full rounded-xl bg-[#4c31d4] font-bold disabled:bg-[#d8d1e5]"
    >
      {pending ? "Saving…" : "Check Answer"}
    </Button>
  );
}

type ActivePracticePageData = PracticePageData & {
  attempt: NonNullable<PracticePageData["attempt"]>;
};

function PracticeAttempt({
  data,
  saved,
  error,
}: {
  data: ActivePracticePageData;
  saved: boolean;
  error: string | undefined;
}) {
  const { activeQuestion, questions, attempt, exercise } = data;
  const isLast = activeQuestion.position === questions.length;
  const [selectedOptionIds, setSelectedOptionIds] = useState(
    () => new Set(activeQuestion.answer?.selectedOptionIds ?? []),
  );
  const [answerText, setAnswerText] = useState(
    activeQuestion.answer?.text ?? "",
  );
  const [dirty, setDirty] = useState(false);
  const initialSaveState: PracticeSaveState = { status: "idle" };
  const [saveState, saveAction] = useActionState(
    savePracticeAnswerAction,
    initialSaveState,
  );
  const revision = (activeQuestion.answer?.clientRevision ?? 0) + 1;
  const answeredCount = questions.filter((question) => question.answer).length;

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function confirmDiscard(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      dirty &&
      !window.confirm(
        "Câu trả lời hiện tại chưa được lưu. Rời câu này và bỏ thay đổi?",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">
            Câu {activeQuestion.position} / {questions.length}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-pretty">
            {exercise.title}
          </h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] tabular-nums">
          Đã lưu {answeredCount}/{questions.length} câu
        </p>
      </div>

      {saved ? (
        <p
          role="status"
          className="rounded-lg bg-[var(--success-subtle)] px-4 py-3 text-sm font-semibold"
        >
          Câu trả lời đã được lưu vào PostgreSQL.
        </p>
      ) : null}
      {error || saveState.status === "error" ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--destructive-subtle)] px-4 py-3 text-sm font-semibold text-[var(--destructive)]"
        >
          {saveState.message ??
            "Không thể lưu hoặc nộp bài. Dữ liệu hiện có vẫn được giữ; hãy thử lại."}
          {saveState.requestId ? (
            <span className="mt-1 block text-xs">
              Mã yêu cầu: {saveState.requestId}
            </span>
          ) : null}
        </p>
      ) : null}

      <nav aria-label="Điều hướng câu hỏi" className="overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-2">
          {questions.map((question) => (
            <li key={question.id}>
              <Link
                href={`/practice/${exercise.slug}?question=${question.position}`}
                onClick={confirmDiscard}
                aria-current={
                  question.id === activeQuestion.id ? "step" : undefined
                }
                aria-label={`Câu ${question.position}${question.answer ? ", đã lưu" : ""}`}
                className={`flex size-11 items-center justify-center rounded-lg border text-sm font-bold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none ${
                  question.id === activeQuestion.id
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                {question.answer ? (
                  <CheckCircle2 aria-hidden="true" size={18} />
                ) : (
                  question.position
                )}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <form action={saveAction} className="space-y-7">
        <input type="hidden" name="attemptId" value={attempt.id} />
        <input type="hidden" name="questionId" value={activeQuestion.id} />
        <input type="hidden" name="exerciseSlug" value={exercise.slug} />
        <input type="hidden" name="clientRevision" value={revision} />
        <input
          type="hidden"
          name="nextPosition"
          value={nextQuestionPosition(
            activeQuestion.position,
            questions.length,
          )}
        />

        <fieldset className="space-y-6">
          <legend className="w-full text-xl leading-8 font-bold text-pretty">
            <LessonMarkdown>{activeQuestion.promptMarkdown}</LessonMarkdown>
          </legend>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeQuestion.type === "multiple_choice"
              ? "Chọn tất cả đáp án đúng. Không có điểm từng phần."
              : activeQuestion.type === "short_text"
                ? "Nhập đáp án chính xác; hệ thống bỏ qua khác biệt chữ hoa và khoảng trắng thừa."
                : "Chọn một đáp án."}
          </p>

          {activeQuestion.type === "short_text" ? (
            <div>
              <label
                htmlFor="answerText"
                className="mb-2 block text-sm font-bold"
              >
                Câu trả lời
              </label>
              <input
                id="answerText"
                name="answerText"
                type="text"
                required
                maxLength={2000}
                value={answerText}
                onChange={(event) => {
                  setAnswerText(event.currentTarget.value);
                  setDirty(true);
                }}
                autoComplete="off"
                className="min-h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-base focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {activeQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--border-strong)]"
                >
                  <input
                    type={
                      activeQuestion.type === "multiple_choice"
                        ? "checkbox"
                        : "radio"
                    }
                    name="selectedOptionIds"
                    value={option.id}
                    required={activeQuestion.type !== "multiple_choice"}
                    checked={selectedOptionIds.has(option.id)}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setSelectedOptionIds((current) => {
                        const next = new Set(current);
                        if (activeQuestion.type === "multiple_choice") {
                          if (checked) next.add(option.id);
                          else next.delete(option.id);
                        } else {
                          next.clear();
                          next.add(option.id);
                        }
                        return next;
                      });
                      setDirty(true);
                    }}
                    className="mt-1 size-4 accent-[var(--primary)]"
                  />
                  <span className="leading-6">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <PracticeSaveButton isLast={isLast} />
          <p className="text-sm text-[var(--muted-foreground)]">
            Có thể refresh hoặc quay lại sau khi đã lưu.
          </p>
        </div>
      </form>

      <SubmitAttemptForm
        attemptId={attempt.id}
        exerciseSlug={exercise.slug}
        disabled={dirty}
      />
    </div>
  );
}

function PracticeStart({
  data,
  error,
}: {
  data: PracticePageData;
  error?: string;
}) {
  if (data.exercise.domain === "grammar") {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl flex-col bg-[#fbf9ff] px-5 py-8 pb-24 lg:min-h-[38rem] lg:rounded-3xl lg:border lg:border-[#e4deef] lg:p-10">
        <p className="text-sm font-bold text-[#4d31d4]">Grammar Practice</p>
        <h1 className="mt-3 text-3xl font-bold">{data.exercise.title}</h1>
        <p className="mt-3 leading-7 text-[#6f687a]">{data.exercise.summary}</p>
        <div className="mt-7 rounded-2xl border border-[#e1dbea] bg-white p-5">
          <LessonMarkdown>{data.exercise.instructionsMarkdown}</LessonMarkdown>
          <p className="mt-4 text-sm font-semibold">
            {data.questions.length} questions · answers saved securely
          </p>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm font-semibold text-[#b52f28]">
            Could not start this practice. Please try again.
          </p>
        ) : null}
        <form action={startPracticeAction} className="mt-auto pt-8">
          <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
          <PracticeStartButton />
        </form>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">
          {data.exercise.domain === "vocabulary" ? "Vocabulary" : "Grammar"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-pretty">
          {data.exercise.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {data.exercise.summary}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <LessonMarkdown>{data.exercise.instructionsMarkdown}</LessonMarkdown>
        <p className="mt-4 text-sm font-semibold">
          {data.questions.length} câu · chấm điểm deterministic
        </p>
      </div>
      {error ? (
        <p role="alert">Không thể bắt đầu bài tập. Hãy thử lại.</p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={startPracticeAction}>
          <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
          <PracticeStartButton />
        </form>
        {data.latestResult ? (
          <Button asChild variant="secondary" className="min-h-11">
            <Link
              href={`/practice/${data.exercise.slug}/result/${data.latestResult.id}`}
            >
              Xem kết quả gần nhất
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PracticeSaveButton({ isLast }: { isLast: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      className="min-h-11"
      disabled={pending}
    >
      <Save aria-hidden="true" size={17} />
      {pending ? "Đang lưu…" : isLast ? "Lưu câu cuối" : "Lưu và sang câu tiếp"}
    </Button>
  );
}

function PracticeStartButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="min-h-11" disabled={pending}>
      {pending ? "Đang bắt đầu…" : "Bắt đầu bài tập"}
    </Button>
  );
}
