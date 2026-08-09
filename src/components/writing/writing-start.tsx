import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Flag,
  Lightbulb,
  ListChecks,
  PenLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { startWritingAction } from "@/features/writing/actions";
import type { WritingPracticePageData } from "@/server/writing/content";

export function WritingStart({
  data,
  error,
}: {
  data: WritingPracticePageData;
  error?: string;
}) {
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
        <p className="flex-1 text-center text-sm font-bold text-[#4d32d4]">
          Writing Practice
        </p>
        <span className="size-10" aria-hidden="true" />
      </header>

      <div className="space-y-6 px-4 py-5 sm:px-6">
        <section>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[#eee8ff] px-2.5 py-1 font-bold text-[#4d32d4]">
              {data.task.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 text-[#736c7e]">
              <Clock3 aria-hidden="true" size={13} />
              {Math.round(data.task.timeLimitSeconds / 60)} min
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-pretty">
            {data.task.title}
          </h1>
        </section>

        <section className="rounded-2xl border border-[#ddd5e9] bg-white p-4 shadow-[0_8px_24px_rgba(72,49,145,0.05)]">
          <div className="flex items-center gap-2 text-[#4d32d4]">
            <Flag aria-hidden="true" size={18} />
            <h2 className="font-bold">Goal</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5f586a]">
            {data.task.promptText}
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold">Practice Focus</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              [ListChecks, "Clear structure"],
              [Clock3, "Time expressions"],
              [BookOpen, "Useful vocabulary"],
              [PenLine, "Sentence order"],
            ].map(([Icon, label]) => (
              <span
                key={label as string}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ddd5e9] bg-white px-3 text-xs font-semibold"
              >
                <Icon aria-hidden="true" size={14} className="text-[#4d32d4]" />
                {label as string}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold">Lesson Flow</h2>
          <ol className="mt-4 space-y-4">
            <FlowStep
              icon={Lightbulb}
              title="Pre-Writing Guidance"
              description="Review the prompt, vocabulary and structure."
              active
            />
            <FlowStep
              icon={PenLine}
              title="Writing"
              description={`Write between ${data.task.minimumWords} and ${data.task.maximumWords} words.`}
            />
            <FlowStep
              icon={Sparkles}
              title="AI Feedback"
              description="Choose whether to request corrections and tips."
            />
          </ol>
        </section>

        <section className="rounded-2xl bg-[#f1edfa] p-4">
          <h2 className="text-sm font-bold">Task Instructions</h2>
          <p className="mt-2 text-xs leading-5 text-[#625b6d]">
            {data.task.instructions}
          </p>
        </section>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-[#ffe1dd] p-4 text-sm font-semibold text-[#a82924]"
          >
            This Writing task could not be started. Please try again.
          </p>
        ) : null}

        <form action={startWritingAction}>
          <input type="hidden" name="taskSlug" value={data.task.slug} />
          <Button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-[#3d22c8] text-white"
          >
            Start Writing
            <ArrowRight aria-hidden="true" size={16} />
          </Button>
        </form>

        {data.latestSubmissionId ? (
          <Link
            href={`/practice/writing/${data.task.slug}/submission/${data.latestSubmissionId}`}
            className="flex min-h-11 items-center justify-center rounded-xl border border-[#d8d0e5] bg-white px-4 text-sm font-bold text-[#4d32d4]"
          >
            View Latest Feedback
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function FlowStep({
  icon: Icon,
  title,
  description,
  active = false,
}: {
  icon: typeof PenLine;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full ${active ? "bg-[#4d32d4] text-white" : "bg-[#ece8f1] text-[#756e80]"}`}
      >
        <Icon aria-hidden="true" size={14} />
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#736c7e]">{description}</p>
      </div>
    </li>
  );
}
