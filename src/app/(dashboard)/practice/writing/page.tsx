import { Bell, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { WritingCatalog } from "@/components/writing/writing-catalog";
import {
  getRecentWritingSubmissions,
  getWritingCatalog,
} from "@/server/writing/content";

export const metadata: Metadata = {
  title: "Writing",
  description: "Practice English writing with saved drafts and AI feedback.",
};

export default async function WritingCatalogPage() {
  const [items, submissions] = await Promise.all([
    getWritingCatalog(),
    getRecentWritingSubmissions(24),
  ]);
  const current =
    items.find((item) => item.activeDraftId) ?? items.at(0) ?? null;
  const completed = submissions.length;
  const target = Math.max(items.length * 4, completed, 1);
  const progress = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] pb-24 text-[#211b2a] lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex h-14 items-center justify-between border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <div>
          <p className="text-xs text-[#70697b]">Hello, Student</p>
          <p className="text-sm font-bold text-[#3823bd]">Indigo Scholar</p>
        </div>
        <Bell aria-hidden="true" size={18} className="text-[#4329c7]" />
      </header>

      <div className="space-y-6 px-4 py-5 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold">Writing</h1>
          <p className="mt-1 text-sm text-[#736c7e]">
            Learn to express your ideas clearly in English.
          </p>
        </div>

        <section className="rounded-2xl border border-[#e3ddec] bg-white p-4 shadow-[0_8px_24px_rgba(72,49,145,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#4d32d4]">
                Writing Progress
              </p>
              <p className="mt-1 text-xs text-[#746d7f]">
                {completed} completed task{completed === 1 ? "" : "s"}
              </p>
            </div>
            <span className="rounded-lg bg-[#f1edff] px-2 py-1 text-[10px] font-bold text-[#4d32d4]">
              A1 BEGINNER
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <strong className="text-2xl text-[#4d32d4]">{progress}%</strong>
            <Link
              href="/practice/writing/history"
              className="text-xs font-bold text-[#4d32d4] underline-offset-4 hover:underline"
            >
              View history
            </Link>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ebe7f1]">
            <div
              className="h-full rounded-full bg-[#7652e8]"
              style={{ width: `${Math.max(progress, completed ? 6 : 0)}%` }}
            />
          </div>
        </section>

        {current ? (
          <section className="overflow-hidden rounded-2xl border border-[#e3ddec] bg-white">
            <div className="h-32 bg-[url('/images/ielts-study-hero.png')] bg-cover bg-center" />
            <div className="p-4">
              <p className="text-[10px] font-bold text-[#4d32d4] uppercase">
                Continue learning
              </p>
              <h2 className="mt-2 text-lg font-bold">{current.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#736c7e]">
                {current.description}
              </p>
              <Link
                href={`/practice/writing/${current.slug}`}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4d32d4] px-4 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                <PenLine aria-hidden="true" size={16} />
                Continue Writing
              </Link>
            </div>
          </section>
        ) : null}

        <WritingCatalog items={items} />
      </div>
    </div>
  );
}
