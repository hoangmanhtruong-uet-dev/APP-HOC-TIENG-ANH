import { Bell, Headphones } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListeningCatalog } from "@/components/listening/listening-catalog";
import { getListeningCatalog } from "@/server/listening/content";
import { getRecentAttemptHistory } from "@/server/practice/content";

export const metadata: Metadata = { title: "Listening" };

export default async function ListeningCatalogPage() {
  const [items, history] = await Promise.all([
    getListeningCatalog(),
    getRecentAttemptHistory(100),
  ]);
  const attempts = history.filter((item) => item.domain === "listening");
  const score = attempts.reduce((sum, item) => sum + item.score, 0);
  const maximum = attempts.reduce((sum, item) => sum + item.maxScore, 0);
  const progress = maximum ? Math.round((score / maximum) * 100) : 0;
  const current = items[0];

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex h-14 items-center justify-between border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <div>
          <p className="text-xs text-[#70697b]">Good morning,</p>
          <p className="text-sm font-bold text-[#2f1bbb]">Scholar</p>
        </div>
        <Bell size={18} className="text-[#4329c7]" />
      </header>
      <main className="space-y-7 px-4 py-5 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold">Listening</h1>
          <p className="mt-1 text-sm text-[#736c7e]">
            Train your ears with everyday English.
          </p>
        </div>
        <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-[#eee8ff] px-2 py-1 text-[10px] font-bold text-[#4d32d4]">
              A1 Beginner
            </span>
            <strong className="text-xl text-[#4d32d4]">{progress}%</strong>
          </div>
          <h2 className="mt-3 text-lg font-bold">Your Progress</h2>
          <p className="mt-1 text-xs text-[#746d7f]">
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
            <div className="mt-5 rounded-xl bg-[#f7f4fc] p-3">
              <p className="text-[10px] font-bold text-[#6f687b] uppercase">
                Next up
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[#eee8ff] text-[#4d32d4]">
                  <Headphones size={16} />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-bold">
                  {current.title}
                </p>
                <Link
                  href={`/practice/listening/${current.slug}`}
                  className="rounded-lg bg-[#4d32d4] px-3 py-2 text-xs font-bold text-white"
                >
                  Continue
                </Link>
              </div>
            </div>
          ) : null}
        </section>
        <ListeningCatalog items={items} />
      </main>
    </div>
  );
}
