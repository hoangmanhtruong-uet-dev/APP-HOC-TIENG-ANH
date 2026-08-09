"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  Languages,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  startPlacementAction,
  submitPlacementAction,
  savePlacementAnswerAction,
  updatePlacementPositionAction,
  type PlacementActionState,
} from "@/features/placement/actions";
import type {
  ActivePlacementAttempt,
  PlacementTest,
} from "@/server/placement/content";

const initialState: PlacementActionState = { status: "idle" };

function SubmitButton({
  label,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="min-h-12 w-full rounded-xl"
      disabled={pending || disabled}
    >
      {pending ? "Saving…" : label}
      {!pending ? <ArrowRight aria-hidden="true" size={18} /> : null}
    </Button>
  );
}

function ActionMessage({ state }: { state: PlacementActionState }) {
  if (state.status !== "error") return null;
  return (
    <p
      role="alert"
      className="mt-4 rounded-xl bg-[var(--destructive-subtle)] p-4 text-sm text-[var(--destructive)]"
    >
      {state.message ?? "Something went wrong. Please try again."}
      {state.requestId ? (
        <span className="mt-1 block text-xs">
          Request ID: {state.requestId}
        </span>
      ) : null}
    </p>
  );
}

export function PlacementIntro() {
  const [state, action] = useActionState(startPlacementAction, initialState);
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-md flex-col justify-center bg-[#fbf9ff] px-5 py-8 sm:min-h-0 sm:rounded-3xl sm:border sm:border-[var(--border)] sm:p-8 sm:shadow-[0_24px_70px_rgb(var(--shadow-color)/0.1)]">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--primary)] text-white shadow-[0_12px_30px_rgb(var(--shadow-color)/0.18)]">
        <Sparkles aria-hidden="true" size={25} />
      </div>
      <p className="mt-6 text-center text-xs font-bold tracking-[0.14em] text-[var(--primary)] uppercase">
        Initial assessment
      </p>
      <h1 className="mt-2 text-center text-3xl font-extrabold tracking-[-0.04em]">
        Find your starting level
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-[var(--muted-foreground)]">
        Answer a short set of foundation questions. Your score is calculated
        securely and saved to your learning profile.
      </p>
      <div className="mt-7 grid grid-cols-3 gap-2">
        {[
          [Languages, "Grammar"],
          [BookOpen, "Vocabulary"],
          [Headphones, "Reading"],
        ].map(([Icon, label]) => {
          const IconComponent = Icon as typeof Languages;
          return (
            <div
              key={String(label)}
              className="rounded-xl border border-[var(--border)] bg-white px-2 py-4 text-center"
            >
              <IconComponent
                aria-hidden="true"
                size={18}
                className="mx-auto text-[var(--primary)]"
              />
              <p className="mt-2 text-xs font-bold">{String(label)}</p>
            </div>
          );
        })}
      </div>
      <form action={action} className="mt-8">
        <SubmitButton label="Start test" />
      </form>
      <ActionMessage state={state} />
    </section>
  );
}

export function PlacementQuestions({
  test,
  attempt,
}: {
  test: PlacementTest;
  attempt: ActivePlacementAttempt;
}) {
  const [state, action] = useActionState(submitPlacementAction, initialState);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(
      test.questions.length - 1,
      Math.max(0, attempt.current_position - 1),
    ),
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    attempt.answers,
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "conflict"
  >("idle");
  const [saveMessage, setSaveMessage] = useState(
    "Progress restored from Supabase.",
  );
  const revisionRef = useRef(attempt.revision);
  const saveQueueRef = useRef(Promise.resolve(true));
  const pendingSavesRef = useRef(0);
  const question = test.questions[currentIndex];
  const selected = answers[question.id];
  const isLast = currentIndex === test.questions.length - 1;
  const progress = Math.round(
    ((currentIndex + 1) / test.questions.length) * 100,
  );

  function persistAnswer(
    questionId: string,
    optionId: string,
    position: number,
  ) {
    pendingSavesRef.current += 1;
    setSaveStatus("saving");
    setSaveMessage("Saving…");
    const operation = saveQueueRef.current.then(async () => {
      const result = await savePlacementAnswerAction({
        attemptId: attempt.id,
        questionId,
        optionId,
        currentPosition: position,
        expectedRevision: revisionRef.current,
      });
      if (result.status === "saved") {
        revisionRef.current = result.revision;
        pendingSavesRef.current -= 1;
        if (pendingSavesRef.current === 0) {
          setSaveStatus("saved");
          setSaveMessage("Saved");
        }
        return true;
      }
      pendingSavesRef.current -= 1;
      setSaveStatus(result.status);
      setSaveMessage(result.message);
      return false;
    });
    saveQueueRef.current = operation;
    return operation;
  }

  async function moveTo(position: number) {
    setSaveStatus("saving");
    setSaveMessage("Saving…");
    const saved = selected
      ? await persistAnswer(question.id, selected, position)
      : await saveQueueRef.current.then(async () => {
          const result = await updatePlacementPositionAction({
            attemptId: attempt.id,
            currentPosition: position,
            expectedRevision: revisionRef.current,
          });
          if (result.status === "saved") {
            revisionRef.current = result.revision;
            setSaveStatus("saved");
            setSaveMessage("Saved");
            return true;
          }
          setSaveStatus(result.status);
          setSaveMessage(result.message);
          return false;
        });
    if (saved) {
      setCurrentIndex(position - 1);
    }
  }

  return (
    <section className="mx-auto min-h-[100dvh] max-w-md bg-[#fbf9ff] sm:min-h-0 sm:rounded-3xl sm:border sm:border-[var(--border)] sm:shadow-[0_24px_70px_rgb(var(--shadow-color)/0.1)]">
      <div className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4">
        <button
          type="button"
          onClick={() => void moveTo(currentIndex)}
          disabled={currentIndex === 0 || saveStatus === "saving"}
          aria-label="Previous question"
          className="grid size-10 place-items-center rounded-xl text-[var(--primary)] disabled:opacity-30"
        >
          <ArrowLeft aria-hidden="true" size={19} />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs font-bold tabular-nums">
          {progress}%
        </span>
      </div>

      <form
        action={action}
        className="flex min-h-[calc(100dvh-3.5rem)] flex-col px-5 py-6 sm:min-h-[36rem]"
      >
        <input type="hidden" name="attemptId" value={attempt.id} />
        <input type="hidden" name="idempotencyKey" value={attempt.id} />
        {Object.entries(answers).map(([questionId, answer]) => (
          <input
            key={questionId}
            type="hidden"
            name={`answer:${questionId}`}
            value={answer}
          />
        ))}
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--primary)] uppercase">
          Question {currentIndex + 1} of {test.questions.length}
        </p>
        <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
          {question.skill.toUpperCase()}
        </p>
        <h1 className="mt-5 text-2xl leading-8 font-extrabold tracking-[-0.035em]">
          {question.prompt}
        </h1>

        <fieldset className="mt-7 space-y-3">
          <legend className="sr-only">Choose one answer</legend>
          {question.options.map((option, index) => (
            <label
              key={option.id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 transition-colors ${selected === option.id ? "border-[var(--primary)] bg-[var(--primary-subtle)] ring-1 ring-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              <input
                className="sr-only"
                type="radio"
                checked={selected === option.id}
                onChange={() => {
                  setAnswers((value) => ({
                    ...value,
                    [question.id]: option.id,
                  }));
                  void persistAnswer(question.id, option.id, currentIndex + 1);
                }}
              />
              <span
                aria-hidden="true"
                className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${selected === option.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)] text-[var(--muted-foreground)]"}`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm font-semibold">{option.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-auto pt-8">
          <p
            aria-live="polite"
            className="mb-3 min-h-5 text-center text-xs font-semibold text-[var(--muted-foreground)]"
          >
            {saveMessage}
          </p>
          {isLast ? (
            <SubmitButton
              label="Finish test"
              disabled={
                !selected ||
                saveStatus === "saving" ||
                saveStatus === "error" ||
                saveStatus === "conflict"
              }
            />
          ) : (
            <Button
              type="button"
              className="min-h-12 w-full rounded-xl"
              disabled={
                !selected ||
                saveStatus === "saving" ||
                saveStatus === "error" ||
                saveStatus === "conflict"
              }
              onClick={() => void moveTo(currentIndex + 2)}
            >
              Next <ArrowRight aria-hidden="true" size={18} />
            </Button>
          )}
          {saveStatus === "error" && selected ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              onClick={() =>
                void persistAnswer(question.id, selected, currentIndex + 1)
              }
            >
              Retry save
            </Button>
          ) : null}
          <ActionMessage state={state} />
        </div>
      </form>
    </section>
  );
}

export function PlacementResult({
  score,
  maxScore,
  level,
}: {
  score: number;
  maxScore: number;
  level: string;
}) {
  const percentage = Math.round((score / Math.max(1, maxScore)) * 100);
  return (
    <section className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-[#fbf9ff] px-5 py-8 text-center sm:min-h-0 sm:rounded-3xl sm:border sm:border-[var(--border)] sm:p-8 sm:shadow-[0_24px_70px_rgb(var(--shadow-color)/0.1)]">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--primary)] text-white">
        <Sparkles aria-hidden="true" size={23} />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">
        Test Complete
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--muted-foreground)]">
        We analyzed your answers and prepared a personalized starting point.
      </p>

      <div className="mt-7 rounded-2xl border-t-2 border-[var(--primary)] bg-white p-5 shadow-[0_8px_24px_rgb(var(--shadow-color)/0.06)]">
        <p className="text-sm font-semibold">Your Starting Level</p>
        <div className="mx-auto mt-4 grid size-20 place-items-center rounded-2xl bg-[var(--primary-subtle)]">
          <div>
            <p className="text-3xl font-extrabold text-[var(--primary)]">
              {level}
            </p>
            <p className="text-[9px] font-bold tracking-wider text-[var(--primary)] uppercase">
              Beginner
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">
            Foundation score
          </span>
          <strong>
            {score}/{maxScore} · {percentage}%
          </strong>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[#007a55]">
          <CheckCircle2 size={15} /> Result saved to your profile
        </p>
      </div>

      <Button asChild className="mt-auto min-h-12 w-full rounded-xl sm:mt-8">
        <Link href="/onboarding">
          Build my learning path <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </Button>
    </section>
  );
}
