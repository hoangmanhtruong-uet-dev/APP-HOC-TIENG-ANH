"use client";

import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock3,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  saveWritingDraftAction,
  submitWritingAction,
} from "@/features/writing/actions";
import { formatWritingTime } from "@/features/writing/model";
import type { WritingPracticePageData } from "@/server/writing/content";

type SaveStatus =
  "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

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
  const [draftText, setDraftText] = useState(submission.draftText);
  const [serverWordCount, setServerWordCount] = useState(submission.wordCount);
  const [minimumWordsMet, setMinimumWordsMet] = useState(
    submission.minimumWordsMet,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [message, setMessage] = useState("Draft synced with PostgreSQL.");
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calculateRemaining(submission.serverNow, submission.expiresAt),
  );
  const [isSubmitting, startSubmitTransition] = useTransition();
  const revisionRef = useRef(submission.serverRevision);
  const lastSavedTextRef = useRef(submission.draftText);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const submitKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    const serverOffset = new Date(submission.serverNow).getTime() - Date.now();
    const expiresAt = new Date(submission.expiresAt).getTime();
    const update = () =>
      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil((expiresAt - (Date.now() + serverOffset)) / 1_000),
        ),
      );
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [submission.expiresAt, submission.serverNow]);

  const save = useCallback(async () => {
    if (saveStatus === "conflict") return false;
    if (savePromiseRef.current) await savePromiseRef.current;
    if (draftText === lastSavedTextRef.current) return true;
    if (!isOnline) {
      setSaveStatus("offline");
      setMessage("Offline. Your latest text is still on this screen.");
      return false;
    }

    const textToSave = draftText;
    const pendingSave = (async () => {
      setSaveStatus("saving");
      setMessage("Saving to PostgreSQL...");
      let result: Awaited<ReturnType<typeof saveWritingDraftAction>>;
      try {
        result = await saveWritingDraftAction({
          submissionId: submission.id,
          taskSlug: data.task.slug,
          draftText: textToSave,
          expectedRevision: revisionRef.current,
        });
      } catch {
        const offline = !isOnline;
        setSaveStatus(offline ? "offline" : "error");
        setMessage(
          offline
            ? "Offline. Your latest text is still on this screen."
            : "Save failed. Your latest text is still on this screen; retry when the connection is stable.",
        );
        return false;
      }
      if (result.status === "saved") {
        revisionRef.current = result.serverRevision;
        lastSavedTextRef.current = textToSave;
        setServerWordCount(result.wordCount);
        setMinimumWordsMet(result.minimumWordsMet);
        setSaveStatus("saved");
        setMessage("Saved to PostgreSQL.");
        return true;
      }
      setSaveStatus(result.status);
      setMessage(result.message);
      return false;
    })();
    savePromiseRef.current = pendingSave;
    try {
      return await pendingSave;
    } finally {
      if (savePromiseRef.current === pendingSave) savePromiseRef.current = null;
    }
  }, [data.task.slug, draftText, isOnline, saveStatus, submission.id]);

  useEffect(() => {
    if (
      draftText === lastSavedTextRef.current ||
      !["idle", "saved"].includes(saveStatus)
    )
      return;
    const timer = window.setTimeout(() => void save(), 800);
    return () => window.clearTimeout(timer);
  }, [draftText, save, saveStatus]);

  useEffect(() => {
    const markOffline = () => {
      setIsOnline(false);
      if (draftText !== lastSavedTextRef.current) {
        setSaveStatus("offline");
        setMessage("Offline. Your latest text is still on this screen.");
      }
    };
    const retryAfterReconnect = () => {
      setIsOnline(true);
      if (
        draftText !== lastSavedTextRef.current &&
        (saveStatus === "offline" || saveStatus === "error")
      ) {
        setSaveStatus("idle");
      }
    };
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", retryAfterReconnect);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", retryAfterReconnect);
    };
  }, [draftText, saveStatus]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (draftText === lastSavedTextRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftText]);

  async function submit() {
    const saved = await save();
    if (!saved || saveStatus === "conflict") return;
    startSubmitTransition(async () => {
      const result = mockContext
        ? await submitMockTestSectionAction({
            mockTestSlug: mockContext.mockTestSlug,
            sessionId: mockContext.sessionId,
            sectionAttemptId: mockContext.sectionAttemptId,
            idempotencyKey: submitKeyRef.current,
          })
        : await submitWritingAction({
            submissionId: submission.id,
            taskSlug: data.task.slug,
            idempotencyKey: submitKeyRef.current,
          });
      if (result?.status === "error") {
        setSaveStatus("error");
        setMessage(result.message);
      }
    });
  }

  const localWordCount = countWords(draftText);
  const isExpired = remainingSeconds === 0;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 text-[#211b2a] lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex min-h-14 items-center gap-3 border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <Link
          href="/practice/writing"
          aria-label="Close editor"
          onClick={(event) => {
            if (
              draftText !== lastSavedTextRef.current &&
              !window.confirm(
                "Your latest changes have not been saved. Leave the editor?",
              )
            ) {
              event.preventDefault();
            }
          }}
          className="grid size-10 place-items-center rounded-full text-[#4d32d4]"
        >
          <X aria-hidden="true" size={18} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-[#4d32d4]">
          {data.task.title}
        </h1>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saveStatus === "saving" || saveStatus === "conflict"}
          className="min-h-10 min-w-20 text-xs font-bold text-[#4d32d4] disabled:opacity-50"
        >
          {saveStatus === "saving" ? "SAVING" : "SAVE DRAFT"}
        </button>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-6">
        <details
          open
          className="rounded-2xl border border-[#ddd5e9] bg-white p-4"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-[#4d32d4]">
            <ListChecks aria-hidden="true" size={17} />
            Task Instructions
          </summary>
          <p className="mt-4 text-sm leading-6 text-[#5f586a]">
            {data.task.promptText}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#736c7e]">
            {data.task.instructions}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-[#eee8ff] px-2 py-1 text-[10px] font-bold text-[#4d32d4]">
              {data.task.difficulty}
            </span>
            <span className="rounded-lg bg-[#f0edf4] px-2 py-1 text-[10px] font-bold text-[#625b6d]">
              {data.task.minimumWords}-{data.task.maximumWords} words
            </span>
          </div>
        </details>

        {isExpired ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl bg-[#fff0da] px-4 py-3 text-sm font-semibold text-[#83520b]"
          >
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={18}
            />
            Suggested time has ended. You can still save and submit; the server
            will record a late submission.
          </p>
        ) : null}

        <section
          aria-label="Writing editor"
          className="overflow-hidden rounded-2xl border border-[#ddd5e9] bg-white"
        >
          <label htmlFor="writing-draft" className="sr-only">
            Your writing
          </label>
          <textarea
            id="writing-draft"
            name="writingDraft"
            value={draftText}
            onChange={(event) => {
              setDraftText(event.target.value);
              if (saveStatus !== "conflict") setSaveStatus("idle");
            }}
            placeholder="Start writing here..."
            maxLength={20_000}
            autoComplete="off"
            spellCheck
            className="min-h-[28rem] w-full resize-y bg-white p-4 text-base leading-7 outline-none placeholder:text-[#b4adbd] sm:min-h-[32rem]"
            aria-describedby="writing-save-status writing-word-guidance"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece7f1] px-4 py-3 text-xs text-[#736c7e]">
            <div className="flex items-center gap-4">
              <BookOpen aria-hidden="true" size={15} />
              <ListChecks aria-hidden="true" size={15} />
              <Lightbulb aria-hidden="true" size={15} />
            </div>
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#ebe7f1]">
                <span
                  className="block h-full rounded-full bg-[#7652e8]"
                  style={{
                    width: `${Math.min(100, (localWordCount / data.task.wordTarget) * 100)}%`,
                  }}
                />
              </span>
              {localWordCount} / {data.task.wordTarget} words
            </span>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <p
            id="writing-save-status"
            role={
              saveStatus === "error" ||
              saveStatus === "offline" ||
              saveStatus === "conflict"
                ? "alert"
                : "status"
            }
            className="flex min-h-6 items-center gap-2 font-semibold text-[#625b6d]"
          >
            {saveStatus === "saved" ? (
              <Check aria-hidden="true" size={15} className="text-[#08754d]" />
            ) : null}
            {saveStatus === "saving" ? (
              <Save aria-hidden="true" size={15} />
            ) : null}
            {message}
          </p>
          <span
            data-testid="writing-timer"
            aria-label={`${remainingSeconds} seconds remaining according to the server`}
            className={`inline-flex items-center gap-1.5 font-mono font-bold ${isExpired ? "text-[#a05e00]" : "text-[#4d32d4]"}`}
          >
            <Clock3 aria-hidden="true" size={14} />
            {formatWritingTime(remainingSeconds)}
          </span>
        </div>

        {saveStatus === "conflict" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RotateCcw aria-hidden="true" size={15} />
            Load PostgreSQL version
          </Button>
        ) : null}

        {saveStatus === "offline" || saveStatus === "error" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void save()}
          >
            <RotateCcw aria-hidden="true" size={15} />
            Retry save
          </Button>
        ) : null}

        <p
          id="writing-word-guidance"
          className="text-xs leading-5 text-[#736c7e]"
        >
          {minimumWordsMet
            ? `The saved draft meets the ${data.task.minimumWords}-word minimum.`
            : `Write at least ${data.task.minimumWords} words. PostgreSQL verifies the count when saving and submitting.`}
          {serverWordCount !== localWordCount
            ? ` ${serverWordCount} words are currently confirmed by the server.`
            : ""}
        </p>

        <ConfirmSubmitButton
          className="min-h-11 w-full rounded-xl bg-[#3d22c8] text-white"
          disabled={
            isSubmitting ||
            saveStatus === "saving" ||
            saveStatus === "conflict" ||
            draftText.trim().length === 0
          }
          pending={isSubmitting}
          label="Submit for Feedback"
          title="Submit and lock this writing?"
          description="After confirmation, the submitted content becomes immutable and cannot be edited."
          onConfirm={() => void submit()}
        />
      </div>
    </div>
  );
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function calculateRemaining(serverNow: string, expiresAt: string) {
  return Math.max(
    0,
    Math.ceil(
      (new Date(expiresAt).getTime() - new Date(serverNow).getTime()) / 1_000,
    ),
  );
}
