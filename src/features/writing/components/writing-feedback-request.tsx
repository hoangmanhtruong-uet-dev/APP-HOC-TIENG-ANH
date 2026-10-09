"use client";

import { Brain, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { requestWritingFeedbackAction } from "@/features/writing/actions";

export function WritingFeedbackRequest({
  taskSlug,
  submissionId,
}: {
  taskSlug: string;
  submissionId: string;
}) {
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function requestFeedback() {
    startTransition(async () => {
      const result = await requestWritingFeedbackAction({
        taskSlug,
        submissionId,
        consent: true,
      });
      setMessage(result.message);
      if (result.status === "ready") window.location.reload();
    });
  }

  if (isPending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-[#fbf9ff] px-6 text-[#211b2a]"
      >
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full border-8 border-[#eee9fb] bg-[#4d32d4] text-white shadow-[0_0_0_10px_#f6f2ff]">
            <Brain aria-hidden="true" size={30} />
          </span>
          <h2 className="mt-10 text-2xl font-bold text-[#3d22c8]">
            Analyzing Your Writing
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#736c7e]">
            We&apos;re checking grammar, vocabulary, sentence structure and
            clarity.
          </p>
          <ol className="mx-auto mt-10 max-w-xs space-y-5 text-left">
            <AnalysisStep
              icon={Check}
              label="Checking grammar"
              state="complete"
            />
            <AnalysisStep
              icon={LoaderCircle}
              label="Understanding your ideas"
              state="current"
            />
            <AnalysisStep
              icon={Sparkles}
              label="Finding improvements"
              state="waiting"
            />
            <AnalysisStep
              icon={Check}
              label="Preparing feedback"
              state="waiting"
            />
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#ddd5e9] p-4 text-sm leading-6">
        <input
          type="checkbox"
          name="writingAiConsent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#4d32d4]"
        />
        <span>
          I agree to send my submitted writing and prompt to the configured AI
          provider for unofficial practice feedback.
        </span>
      </label>
      <Button
        type="button"
        className="mt-4 min-h-11 w-full rounded-xl bg-[#4d32d4] text-white"
        disabled={!consent || isPending}
        onClick={requestFeedback}
      >
        <Sparkles aria-hidden="true" size={17} />
        {isPending ? "Creating feedback..." : "Create Feedback"}
      </Button>
      {message ? (
        <p role="status" className="mt-3 text-sm font-semibold">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function AnalysisStep({
  icon: Icon,
  label,
  state,
}: {
  icon: typeof Sparkles;
  label: string;
  state: "complete" | "current" | "waiting";
}) {
  return (
    <li
      className={`flex items-center gap-3 ${state === "waiting" ? "text-[#b9b3c1]" : "text-[#332b3d]"}`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full ${state === "waiting" ? "bg-[#efecf2]" : "bg-[#4d32d4] text-white"}`}
      >
        <Icon aria-hidden="true" size={14} />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {state === "current" ? (
        <span className="h-1 w-16 overflow-hidden rounded-full bg-[#e7e2ed]">
          <span className="block h-full w-1/2 rounded-full bg-[#7652e8]" />
        </span>
      ) : null}
    </li>
  );
}
