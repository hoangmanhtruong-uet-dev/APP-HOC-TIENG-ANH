import { ArrowLeft, BookOpenText, Clock3, NotebookTabs } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getRecentAttemptHistory } from "@/server/practice/content";

export const metadata: Metadata = { title: "My Mistakes Notebook" };

const domainLabels = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  reading: "Reading",
  listening: "Listening",
} as const;

export default async function MistakesNotebookPage() {
  const attempts = await getRecentAttemptHistory(40);
  const reviewItems = attempts.filter((item) => item.score < item.maxScore);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e4deef]">
      <header className="flex min-h-16 items-center gap-2 border-b border-[#e7e1ef] bg-white px-3 lg:rounded-t-3xl">
        <Link
          href="/learn/grammar"
          aria-label="Back to grammar"
          className="grid size-11 place-items-center rounded-full text-[#3e29c2]"
        >
          <ArrowLeft size={19} />
        </Link>
        <div>
          <p className="text-sm font-bold text-[#331fb7]">Indigo Scholar</p>
          <p className="text-xs text-[#777080]">
            Review and master difficult concepts
          </p>
        </div>
      </header>

      <main className="space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold">My Mistakes Notebook</h1>
          <p className="mt-1 text-sm text-[#716a7c]">
            Review and master the concepts you&apos;ve struggled with.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[#eee8ff] p-4 text-[#452bc7]">
          <span className="grid size-10 place-items-center rounded-full bg-[#5639d8] text-white">
            <NotebookTabs size={20} />
          </span>
          <div>
            <p className="text-2xl font-bold">{reviewItems.length}</p>
            <p className="text-xs font-semibold">Mistakes saved</p>
          </div>
        </div>

        {reviewItems.length === 0 ? (
          <div className="grid min-h-96 place-items-center rounded-2xl border border-[#e3dced] bg-white p-8 text-center">
            <div>
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#f2eef8] text-[#8c84a0]">
                <BookOpenText size={34} />
              </span>
              <h2 className="mt-5 text-xl font-bold">Nothing to review</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#746d80]">
                Your difficult questions will appear here after PostgreSQL
                scores a practice.
              </p>
              <Link
                href="/learn/grammar"
                className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#4c31d4] px-5 font-bold text-white"
              >
                Continue Grammar →
              </Link>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {reviewItems.map((item) => {
              const missed = item.maxScore - item.score;
              const href =
                item.domain === "reading" || item.domain === "listening"
                  ? `/practice/${item.domain}/${item.exerciseSlug}/result/${item.id}`
                  : `/practice/${item.exerciseSlug}/result/${item.id}?view=review`;
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[#e2dced] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#eee8ff] text-[#4d32d4]">
                      <NotebookTabs size={17} />
                    </span>
                    <span className="rounded-full bg-[#ffe1dd] px-2 py-1 text-[10px] font-bold text-[#b0322b]">
                      {missed} {missed === 1 ? "ITEM" : "ITEMS"}
                    </span>
                  </div>
                  <p className="mt-4 text-[10px] font-bold tracking-wide text-[#5a3dda] uppercase">
                    {domainLabels[item.domain]}
                  </p>
                  <h2 className="mt-1 font-bold">{item.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#756e80]">
                    <Clock3 size={12} /> Score {item.score}/{item.maxScore}
                  </p>
                  <Link
                    href={href}
                    className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#4c31d4] text-sm font-bold text-white"
                  >
                    Review
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
