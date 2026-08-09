import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  HelpCircle,
  Languages,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { startReadingPracticeAction } from "@/features/reading/actions";
import type { ReadingPracticePageData } from "@/server/reading/content";

export function ReadingStart({
  data,
  error,
}: {
  data: ReadingPracticePageData;
  error?: string;
}) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e4deef]">
      <header className="flex h-14 items-center border-b border-[#e7e1ef] bg-white px-3 lg:rounded-t-3xl">
        <Link
          href="/practice/reading"
          aria-label="Back to Reading"
          className="grid size-11 place-items-center text-[#4329c7]"
        >
          <ArrowLeft size={19} />
        </Link>
        <p className="flex-1 text-center text-sm font-bold">Lesson Overview</p>
        <span className="w-11" />
      </header>
      <main className="space-y-6 px-4 py-6 sm:px-6">
        <div className="text-center">
          <span className="rounded-full bg-[#eee8ff] px-3 py-1 text-[10px] font-bold text-[#4d32d4]">
            {data.exercise.difficulty} · Reading
          </span>
          <h1 className="mt-4 text-2xl font-bold">{data.exercise.title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#716a7c]">
            {data.exercise.summary}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            [
              Clock3,
              `${Math.round(data.exercise.timeLimitSeconds / 60)} min`,
              "Time",
            ],
            [HelpCircle, `${data.questions.length}`, "Questions"],
            [BookOpenText, `${data.passage.sections.length}`, "Sections"],
          ].map(([Icon, value, label]) => {
            const ItemIcon = Icon as typeof Clock3;
            return (
              <div
                key={String(label)}
                className="rounded-2xl border border-[#e2dced] bg-white p-3 text-center"
              >
                <ItemIcon className="mx-auto text-[#4d32d4]" size={18} />
                <p className="mt-2 font-bold">{String(value)}</p>
                <p className="text-[10px] text-[#756e80] uppercase">
                  {String(label)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="relative min-h-44 overflow-hidden rounded-2xl">
          <Image
            src="/images/ielts-flow-hero-v2.webp"
            alt="English study workspace"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
        <section className="rounded-2xl border border-[#e2dced] bg-white p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Languages size={18} className="text-[#4d32d4]" />
            Key Vocabulary Preview
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["wake up", "breakfast", "usually", "morning", "+3 more"].map(
              (word) => (
                <span
                  key={word}
                  className="rounded-lg bg-[#f0ebf8] px-3 py-1.5 text-xs text-[#5d5668]"
                >
                  {word}
                </span>
              ),
            )}
          </div>
        </section>
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-[#ffe2de] p-3 text-sm font-bold text-[#a72d27]"
          >
            Could not start this reading.
          </p>
        ) : null}
        <form action={startReadingPracticeAction}>
          <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
          <Button type="submit" className="min-h-12 w-full rounded-xl">
            Start Reading →
          </Button>
        </form>
      </main>
    </div>
  );
}
