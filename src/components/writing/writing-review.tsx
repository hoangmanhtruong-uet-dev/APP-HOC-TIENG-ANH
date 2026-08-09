import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { WritingFeedbackRequest } from "@/components/writing/writing-feedback-request";
import { WritingFeedbackView } from "@/components/writing/writing-feedback-view";
import type { WritingSubmissionReviewData } from "@/server/writing/content";

export function WritingReview({ data }: { data: WritingSubmissionReviewData }) {
  if (data.feedback) return <WritingFeedbackView data={data} />;

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
            Submitted writing
          </p>
          <p className="truncate text-sm font-bold">{data.task.title}</p>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <section>
          <h1 className="text-2xl font-bold">{data.task.title}</h1>
          <p className="mt-2 text-xs text-[#736c7e]">
            {data.submission.wordCount} words. Your submitted content is locked.
          </p>
        </section>

        <details className="rounded-2xl border border-[#e3ddec] bg-white p-4">
          <summary className="cursor-pointer font-bold">
            View submitted writing
          </summary>
          <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#5f586a]">
            {data.submission.text}
          </p>
        </details>

        <section className="rounded-2xl border border-[#e3ddec] bg-white p-5">
          <div className="flex items-center gap-2 text-[#4d32d4]">
            <Sparkles aria-hidden="true" size={18} />
            <h2 className="text-lg font-bold">Get AI Feedback</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#736c7e]">
            Feedback is optional and for practice only. Your submitted writing
            remains available if the AI service is unavailable.
          </p>
          {data.aiAvailable ? (
            <WritingFeedbackRequest
              taskSlug={data.task.slug}
              submissionId={data.submission.id}
            />
          ) : (
            <p className="mt-4 rounded-xl bg-[#f3eff8] p-3 text-sm font-semibold text-[#6b6476]">
              AI feedback is not configured yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
