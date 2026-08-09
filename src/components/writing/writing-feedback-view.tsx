"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { WritingSubmissionReviewData } from "@/server/writing/content";

const criterionLabels = {
  taskResponse: "Clarity",
  coherenceCohesion: "Structure",
  lexicalResource: "Vocabulary",
  grammaticalRangeAccuracy: "Grammar",
} as const;

type Correction = NonNullable<
  WritingSubmissionReviewData["feedback"]
>["correctedExamples"][number];

export function WritingFeedbackView({
  data,
}: {
  data: WritingSubmissionReviewData;
}) {
  const feedback = data.feedback;
  const [selectedCorrection, setSelectedCorrection] =
    useState<Correction | null>(null);
  const [comparisonTab, setComparisonTab] = useState<"original" | "improved">(
    "improved",
  );
  const improvedWriting = useMemo(
    () =>
      feedback
        ? feedback.correctedExamples.reduce(
            (text, correction) =>
              text.replace(correction.source, correction.revision),
            data.submission.text,
          )
        : data.submission.text,
    [data.submission.text, feedback],
  );

  if (!feedback) return null;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 text-[#211b2a] lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex min-h-14 items-center gap-3 border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <Link
          href="/practice/writing"
          aria-label="Back to Writing"
          className="grid size-10 place-items-center rounded-full text-[#4d32d4]"
        >
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-[#746d7f] uppercase">
            Writing and feedback
          </p>
          <p className="truncate text-sm font-bold">{data.task.title}</p>
        </div>
      </header>

      <main className="space-y-5 px-4 py-5 sm:px-6">
        <section>
          <p className="text-[10px] font-bold text-[#746d7f] uppercase">
            My writing task
          </p>
          <h1 className="mt-2 text-2xl font-bold">{data.task.title}</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#dff8ed] px-3 py-1.5 text-xs font-bold text-[#08754d]">
            <CheckCircle2 aria-hidden="true" size={14} />
            Good progress
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {Object.entries(feedback.criteria).map(([key, criterion]) => (
            <article
              key={key}
              className="rounded-2xl border border-[#e3ddec] bg-white p-4"
            >
              <p className="text-[10px] font-bold text-[#736c7e] uppercase">
                {criterionLabels[key as keyof typeof criterionLabels]}
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-2xl text-[#4d32d4]">
                  {Math.round((criterion.band / 9) * 100)}
                  <span className="text-xs text-[#8a8394]">/100</span>
                </strong>
                <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#ebe7f1]">
                  <span
                    className="block h-full rounded-full bg-[#7652e8]"
                    style={{ width: `${(criterion.band / 9) * 100}%` }}
                  />
                </span>
              </div>
            </article>
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

        {feedback.correctedExamples.length ? (
          <section>
            <h2 className="mb-3 text-base font-bold">Inline Corrections</h2>
            <div className="space-y-3">
              {feedback.correctedExamples.map((example) => (
                <button
                  type="button"
                  key={`${example.source}-${example.revision}`}
                  onClick={() => setSelectedCorrection(example)}
                  className="block min-h-11 w-full rounded-2xl border border-[#e3ddec] bg-white p-4 text-left transition active:scale-[0.99]"
                >
                  <p className="text-sm leading-6 text-[#a43834] line-through decoration-[#dc6b65]">
                    {example.source}
                  </p>
                  <div className="my-2 h-px bg-[#ece7f1]" />
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-sm leading-6 font-semibold text-[#08754d]">
                      {example.revision}
                    </p>
                    <ChevronRight
                      aria-hidden="true"
                      size={16}
                      className="mt-1 shrink-0 text-[#4d32d4]"
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
          <div className="flex items-center gap-2 text-[#4d32d4]">
            <Lightbulb aria-hidden="true" size={17} />
            <h2 className="font-bold">Focus Next</h2>
          </div>
          <ul className="mt-3 space-y-3">
            {feedback.priorityIssues.slice(0, 3).map((item) => (
              <li key={`${item.issue}-${item.evidence}`}>
                <p className="text-sm font-bold">{item.issue}</p>
                <p className="mt-1 text-xs leading-5 text-[#736c7e]">
                  {item.evidence}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
          <h2 className="text-base font-bold">See an Improved Version</h2>
          <div className="mt-3 grid grid-cols-2 rounded-xl bg-[#f0edf5] p-1">
            <button
              type="button"
              onClick={() => setComparisonTab("original")}
              className={`min-h-10 rounded-lg px-3 text-xs font-bold ${comparisonTab === "original" ? "bg-white text-[#4d32d4] shadow-sm" : "text-[#736c7e]"}`}
            >
              Your Writing
            </button>
            <button
              type="button"
              onClick={() => setComparisonTab("improved")}
              className={`min-h-10 rounded-lg px-3 text-xs font-bold ${comparisonTab === "improved" ? "bg-white text-[#4d32d4] shadow-sm" : "text-[#736c7e]"}`}
            >
              Improved Version
            </button>
          </div>
          <p className="mt-4 rounded-xl bg-[#faf8fd] p-4 text-sm leading-7 whitespace-pre-wrap text-[#433c4c]">
            {comparisonTab === "improved"
              ? improvedWriting
              : data.submission.text}
          </p>
          <div className="mt-4 space-y-2">
            <ChangeSummary
              label={`${feedback.correctedExamples.length} grammar and wording corrections`}
            />
            <ChangeSummary
              label={`${feedback.priorityIssues.length} priority improvements`}
            />
            <ChangeSummary
              label={`${feedback.revisionPlan.length} revision steps`}
            />
          </div>
          <Link
            href={`/practice/writing/${data.task.slug}/submission/${data.submission.id}/improved`}
            className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#7652e8] px-4 text-sm font-bold text-[#4d32d4]"
          >
            View progress comparison
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/practice/writing/${data.task.slug}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d8d0e5] bg-white px-3 text-sm font-bold text-[#4d32d4] transition active:scale-[0.98]"
          >
            <PenLine aria-hidden="true" size={16} />
            Write Again
          </Link>
          <Link
            href={`/practice/writing/${data.task.slug}/submission/${data.submission.id}/complete`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3d22c8] px-3 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            Finish Practice
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </main>

      {selectedCorrection ? (
        <CorrectionDetail
          correction={selectedCorrection}
          taskSlug={data.task.slug}
          onClose={() => setSelectedCorrection(null)}
        />
      ) : null}
    </div>
  );
}

function CorrectionDetail({
  correction,
  taskSlug,
  onClose,
}: {
  correction: Correction;
  taskSlug: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17111f]/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close correction detail"
        className="absolute inset-0"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="correction-title"
        className="relative w-full max-w-lg rounded-t-3xl bg-[#fbf9ff] p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#c7c0ce] sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="correction-title" className="text-lg font-bold">
            Correction Detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-[#ddd5e9] bg-white p-4">
          <p className="text-[10px] font-bold text-[#736c7e] uppercase">
            Original
          </p>
          <p className="mt-2 text-sm leading-6 text-[#a43834] line-through">
            {correction.source}
          </p>
          <div className="my-3 h-px bg-[#ece7f1]" />
          <p className="text-[10px] font-bold text-[#4d32d4] uppercase">
            Suggestion
          </p>
          <p className="mt-2 text-sm leading-6 font-semibold text-[#08754d]">
            {correction.revision}
          </p>
        </div>
        <div className="mt-4 rounded-2xl bg-[#f0edf7] p-4">
          <p className="text-xs font-bold text-[#4d32d4]">Why?</p>
          <p className="mt-2 text-sm leading-6 text-[#625b6d]">
            This revision comes from the feedback provider and keeps the meaning
            of your original sentence while improving clarity or accuracy.
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-[#d8d0e5] bg-white px-4 text-sm font-bold text-[#625b6d]"
          >
            Close
          </button>
          <Link
            href={`/practice/writing/${taskSlug}`}
            className="flex min-h-11 items-center justify-center rounded-xl bg-[#3d22c8] px-4 text-sm font-bold text-white"
          >
            Practice Again
          </Link>
        </div>
      </section>
    </div>
  );
}

function ChangeSummary({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#e3ddec] bg-white p-3">
      <CheckCircle2
        aria-hidden="true"
        size={15}
        className="mt-0.5 shrink-0 text-[#4d32d4]"
      />
      <p className="text-xs leading-5 font-semibold">{label}</p>
    </div>
  );
}
