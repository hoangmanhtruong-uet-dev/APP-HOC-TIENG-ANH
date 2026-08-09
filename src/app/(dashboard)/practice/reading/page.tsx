import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ReadingCatalog } from "@/components/reading/reading-catalog";
import { getRecentAttemptHistory } from "@/server/practice/content";
import { getReadingCatalog } from "@/server/reading/content";

export const metadata: Metadata = { title: "Reading" };

export default async function ReadingCatalogPage() {
  const [items, history] = await Promise.all([
    getReadingCatalog(),
    getRecentAttemptHistory(100),
  ]);
  const attempts = history.filter((item) => item.domain === "reading");
  const score = attempts.reduce((sum, item) => sum + item.score, 0);
  const maximum = attempts.reduce((sum, item) => sum + item.maxScore, 0);
  const progress = maximum ? Math.round((score / maximum) * 100) : 0;
  const current = items[0];
  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex h-14 items-center justify-between border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <p className="font-bold text-[#2f1bbb]">Reading</p>
        <Bell size={18} className="text-[#4329c7]" />
      </header>
      <main className="space-y-7 px-4 py-5 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold">
            Understand English one text at a time.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#736c7e]">
            Build your comprehension skills through targeted reading exercises.
          </p>
        </div>
        <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Reading Progress</h2>
            <strong className="text-xl text-[#4d32d4]">{progress}%</strong>
          </div>
          <p className="mt-1 text-xs text-[#756e80]">
            {score}/
            {maximum ||
              items.reduce((sum, item) => sum + item.questionCount, 0)}{" "}
            questions completed
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9e4ef]">
            <div
              className="h-full rounded-full bg-[#7752e8]"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
          {current ? (
            <div className="mt-5">
              <p className="text-[10px] font-bold text-[#736c7e] uppercase">
                Up next
              </p>
              <p className="mt-1 font-bold">{current.title}</p>
              <Link
                href={`/practice/reading/${current.slug}`}
                className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-[#4d32d4] text-sm font-bold text-white"
              >
                Continue Reading →
              </Link>
            </div>
          ) : null}
        </section>
        <ReadingCatalog items={items} />
      </main>
    </div>
  );
}
