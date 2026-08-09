import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  Headphones,
  MessageCircleQuestion,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { startListeningPracticeAction } from "@/features/listening/actions";
import type { ListeningPracticePageData } from "@/server/listening/content";

export function ListeningStart({
  data,
  error,
}: {
  data: ListeningPracticePageData;
  error?: string;
}) {
  const steps = [
    [BookOpenText, "Learn Key Words", "Review vocabulary before listening."],
    [Headphones, "Listen", "Listen to the dialogue while pausing."],
    [
      MessageCircleQuestion,
      "Answer Questions",
      `Test your comprehension with ${data.questions.length} questions.`,
    ],
    [
      RotateCcw,
      "Listen Again",
      "Follow along with the transcript after submit.",
    ],
  ] as const;
  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e4deef]">
      <header className="flex h-14 items-center border-b border-[#e7e1ef] bg-white px-3 lg:rounded-t-3xl">
        <Link
          href="/practice/listening"
          aria-label="Back to Listening"
          className="grid size-11 place-items-center text-[#4329c7]"
        >
          <ArrowLeft size={19} />
        </Link>
        <p className="text-sm font-bold text-[#4329c7]">
          Good morning, Scholar
        </p>
      </header>
      <main className="space-y-6 px-4 py-5 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-[#e2dced] bg-white">
          <div className="relative min-h-44">
            <Image
              src="/images/ielts-study-hero.png"
              alt="Learner practising Listening with headphones"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
          <div className="p-4">
            <span className="rounded-full bg-[#eee8ff] px-2 py-1 text-[10px] font-bold text-[#4d32d4]">
              {data.exercise.difficulty}
            </span>
            <h1 className="mt-3 text-2xl font-bold">{data.exercise.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#716a7c]">
              {data.exercise.summary}
            </p>
            <div className="mt-4 rounded-xl bg-[#f3effb] p-3">
              <p className="text-[10px] font-bold text-[#4d32d4] uppercase">
                Lesson Goal
              </p>
              <p className="mt-1 text-xs leading-5">
                Understand a simple conversation and identify key details.
              </p>
            </div>
            <p className="mt-4 flex items-center gap-4 text-xs text-[#716a7c]">
              <span className="inline-flex items-center gap-1">
                <Clock3 size={13} />
                {Math.round(data.exercise.timeLimitSeconds / 60)} min
              </span>
              <span>{data.questions.length} activities</span>
            </p>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-base font-bold">Lesson Plan</h2>
          <ol className="space-y-2">
            {steps.map(([Icon, title, description], index) => (
              <li
                key={title}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-[#e2dced] bg-white px-4"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-[#eee8ff] text-[#4d32d4]">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-[#746d80] uppercase">
                    Section {index + 1}
                  </p>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs text-[#746d80]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-[#ffe2de] p-3 text-sm font-bold text-[#a72d27]"
          >
            Could not start this lesson. Please try again.
          </p>
        ) : null}
        <form action={startListeningPracticeAction}>
          <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
          <Button type="submit" className="min-h-12 w-full rounded-xl">
            Start Lesson →
          </Button>
        </form>
      </main>
    </div>
  );
}
