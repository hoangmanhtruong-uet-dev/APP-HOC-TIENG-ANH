"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Lightbulb,
  Mic2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { requestSpeakingAiReviewAction } from "@/features/speaking/ai-actions";
import type { SpeakingReviewData } from "@/server/speaking/content";

export function SpeakingReview({ data }: { data: SpeakingReviewData }) {
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const feedback = data.feedback;
  const criteria =
    feedback?.criteria &&
    typeof feedback.criteria === "object" &&
    !Array.isArray(feedback.criteria)
      ? Object.entries(feedback.criteria).filter(
          (item): item is [string, string] => typeof item[1] === "string",
        )
      : [];
  const strengths = Array.isArray(feedback?.strengths)
    ? feedback.strengths.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const suggestions = Array.isArray(feedback?.suggestions)
    ? feedback.suggestions.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const metrics = feedback
    ? ([
        ["Pronunciation", feedback.estimatedPronunciationBand],
        ["Fluency", feedback.estimatedFluencyBand],
        ["Grammar", feedback.estimatedGrammarBand],
        ["Vocabulary", feedback.estimatedLexicalBand],
      ] as const)
    : [];

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 text-[#211b2a] lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex min-h-14 items-center gap-3 border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <Link
          href="/practice/speaking"
          aria-label="Back to Speaking"
          className="grid size-10 place-items-center rounded-full text-[#4d32d4]"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-[#746d7f] uppercase">
            Speaking AI Feedback
          </p>
          <p className="truncate text-sm font-bold">{data.set.title}</p>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <section>
          <p className="text-[10px] font-bold text-[#746d7f] uppercase">
            Speaking and feedback
          </p>
          <h1 className="mt-2 text-2xl font-bold">{data.set.title}</h1>
          {feedback ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#dff8ed] px-3 py-1.5 text-xs font-bold text-[#08754d]">
              <CheckCircle2 aria-hidden="true" size={14} />
              Good progress
            </div>
          ) : null}
        </section>

        {feedback ? (
          <>
            <section className="grid grid-cols-2 gap-3">
              {metrics.map(([label, value]) => (
                <Metric key={label} label={label} value={value} />
              ))}
            </section>

            <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
              <div className="flex items-center gap-2 text-[#4d32d4]">
                <Sparkles aria-hidden="true" size={17} />
                <h2 className="font-bold">Your Feedback</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5f586a]">
                {feedback.summary}
              </p>
            </section>

            {criteria.length ? (
              <section className="space-y-3">
                <h2 className="text-base font-bold">Skill Breakdown</h2>
                {criteria.map(([label, value]) => (
                  <article
                    key={label}
                    className="rounded-2xl border border-[#e3ddec] bg-white p-4"
                  >
                    <h3 className="text-sm font-bold capitalize">
                      {humanize(label)}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[#736c7e]">
                      {value}
                    </p>
                  </article>
                ))}
              </section>
            ) : null}

            <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
              <div className="flex items-center gap-2 text-[#4d32d4]">
                <Lightbulb aria-hidden="true" size={17} />
                <h2 className="font-bold">Fluency Tip</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5f586a]">
                {suggestions.at(0) ??
                  "Try linking words together and keep a natural rhythm."}
              </p>
            </section>

            {strengths.length ? (
              <section className="rounded-2xl border border-[#cfeede] bg-[#effbf5] p-4">
                <h2 className="font-bold text-[#08754d]">What went well</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#245f49]">
                  {strengths.slice(0, 3).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2
                        aria-hidden="true"
                        size={15}
                        className="mt-1 shrink-0"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <details className="rounded-2xl border border-[#e3ddec] bg-white p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
                <Headphones aria-hidden="true" size={17} />
                Review recordings
              </summary>
              <ol className="mt-4 space-y-4">
                {data.responses.map((response) => (
                  <li key={response.id} className="rounded-xl bg-[#f7f4fc] p-3">
                    <p className="text-sm font-bold">{response.prompt}</p>
                    {response.signedUrl ? (
                      <audio
                        controls
                        preload="none"
                        src={response.signedUrl}
                        className="mt-3 w-full"
                      >
                        Your browser does not support audio playback.
                      </audio>
                    ) : (
                      <p className="mt-2 text-xs text-[#a43834]">
                        This private recording is currently unavailable.
                      </p>
                    )}
                    {response.transcript ? (
                      <p className="mt-3 text-xs leading-5 text-[#736c7e]">
                        {response.transcript}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </details>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/practice/speaking/${data.set.slug}/attempt/${data.attempt.id}/progress`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d8d0e5] bg-white px-4 text-sm font-bold text-[#4d32d4]"
              >
                <TrendingUp aria-hidden="true" size={16} />
                View Progress
              </Link>
              <Link
                href={`/practice/speaking/${data.set.slug}/attempt/${data.attempt.id}/pronunciation`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4d32d4] px-4 text-sm font-bold text-white"
              >
                <Mic2 aria-hidden="true" size={16} />
                Practice Pronunciation
              </Link>
            </div>
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-[#e3ddec] bg-white p-5">
              <div className="flex gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#4d32d4]"
                />
                <div>
                  <h2 className="text-lg font-bold">
                    Transcript and AI feedback are optional
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#736c7e]">
                    Audio is sent to the configured provider only after you
                    consent. No synthetic score is created when the service is
                    unavailable.
                  </p>
                </div>
              </div>
              <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[#ddd5e9] p-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 size-5 accent-[#4d32d4]"
                />
                <span className="text-sm leading-6">
                  I agree to send this attempt&apos;s audio for transcript and
                  unofficial practice feedback.
                </span>
              </label>
              <button
                type="button"
                disabled={!consent || pending || !data.aiAvailable}
                onClick={() =>
                  startTransition(async () => {
                    const result = await requestSpeakingAiReviewAction({
                      attemptId: data.attempt.id,
                      setSlug: data.set.slug,
                      consent: true,
                    });
                    setMessage(result.message);
                    if (result.status === "ready") location.reload();
                  })
                }
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4d32d4] px-5 py-2 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Volume2 aria-hidden="true" size={16} />
                {pending
                  ? "Creating feedback..."
                  : data.aiAvailable
                    ? "Create Feedback"
                    : "AI is not configured"}
              </button>
              {message ? (
                <p aria-live="polite" className="mt-3 text-sm text-[#736c7e]">
                  {message}
                </p>
              ) : null}
            </section>

            <details className="rounded-2xl border border-[#e3ddec] bg-white p-4">
              <summary className="cursor-pointer font-bold">
                Review saved recordings
              </summary>
              <p className="mt-2 text-sm text-[#736c7e]">
                {data.responses.length} response
                {data.responses.length === 1 ? "" : "s"} stored privately.
              </p>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  const displayValue = value === null ? null : Math.round((value / 9) * 100);
  return (
    <article className="rounded-2xl border border-[#e3ddec] bg-white p-4">
      <p className="text-[10px] font-bold text-[#736c7e] uppercase">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className="text-2xl text-[#4d32d4]">
          {displayValue ?? "N/A"}
          {displayValue === null ? null : (
            <span className="text-xs text-[#8a8394]">/100</span>
          )}
        </strong>
        <span className="grid size-8 place-items-center rounded-full bg-[#f1edff] text-[#4d32d4]">
          {label === "Pronunciation" ? (
            <Volume2 aria-hidden="true" size={14} />
          ) : (
            <Sparkles aria-hidden="true" size={14} />
          )}
        </span>
      </div>
    </article>
  );
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}
