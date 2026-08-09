import { Bell, Mic2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SpeakingCatalog } from "@/components/speaking/speaking-catalog";
import {
  getSpeakingDashboardData,
  getSpeakingCatalog,
} from "@/server/speaking/content";

export const metadata: Metadata = {
  title: "Speaking",
  description: "Practice speaking with private audio and optional feedback.",
};

export default async function SpeakingCatalogPage() {
  const [items, attempts] = await Promise.all([
    getSpeakingCatalog(),
    getSpeakingDashboardData(24),
  ]);
  const current =
    items.find((item) => item.activeAttemptId) ?? items.at(0) ?? null;
  const answered = attempts.reduce((sum, item) => sum + item.responseCount, 0);
  const target = Math.max(
    items.reduce((sum, item) => sum + item.promptCount, 0) * 3,
    answered,
    1,
  );
  const progress = Math.min(100, Math.round((answered / target) * 100));
  const latestFeedback = attempts.find((attempt) => attempt.feedback)?.feedback;
  const metrics = [
    ["Pronunciation", latestFeedback?.estimatedPronunciationBand],
    ["Fluency", latestFeedback?.estimatedFluencyBand],
    ["Grammar", latestFeedback?.estimatedGrammarBand],
    ["Vocabulary", latestFeedback?.estimatedLexicalBand],
  ] as const;

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
          <h1 className="text-2xl font-bold">Speaking</h1>
          <p className="mt-1 text-sm text-[#736c7e]">
            Practice speaking English with confidence.
          </p>
        </div>

        <section className="rounded-2xl border border-[#e3ddec] bg-white p-4 shadow-[0_8px_24px_rgba(72,49,145,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="rounded-lg bg-[#f1edff] px-2 py-1 text-[10px] font-bold text-[#4d32d4]">
                A1 BEGINNER
              </span>
              <h2 className="mt-3 text-lg font-bold">Speaking Progress</h2>
            </div>
            <div className="text-right">
              <strong className="text-2xl text-[#4d32d4]">{progress}%</strong>
              <p className="text-[10px] text-[#746d7f]">Level goal</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#746d7f]">
            {answered} recorded answer{answered === 1 ? "" : "s"}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ebe7f1]">
            <div
              className="h-full rounded-full bg-[#7652e8]"
              style={{ width: `${Math.max(progress, answered ? 6 : 0)}%` }}
            />
          </div>
          <h3 className="mt-5 text-sm font-bold">Learning Progress</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {metrics.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[#e3ddec] bg-[#fbf9ff] p-3 text-center"
              >
                <p className="text-[10px] text-[#736c7e]">{label}</p>
                <strong className="mt-1 block text-lg text-[#4d32d4]">
                  {value == null ? "—" : Math.round((value / 9) * 100)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        {current ? (
          <section className="rounded-2xl border border-[#e3ddec] bg-white p-4">
            <p className="text-[10px] font-bold text-[#4d32d4] uppercase">
              Next up
            </p>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eee8ff] text-[#4d32d4]">
                <Mic2 aria-hidden="true" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{current.title}</h2>
                <p className="mt-1 text-xs leading-5 text-[#736c7e]">
                  {current.description}
                </p>
              </div>
            </div>
            <Link
              href={`/practice/speaking/${current.slug}`}
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#4d32d4] px-4 text-sm font-bold text-white transition active:scale-[0.98]"
            >
              Continue Speaking
            </Link>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Today&apos;s Challenge</h2>
            <Link
              href="/practice/speaking/progress"
              className="text-xs font-bold text-[#4d32d4]"
            >
              View progress
            </Link>
          </div>
          <div className="rounded-2xl border border-[#ded7ec] bg-[#f3efff] p-4">
            <p className="text-[10px] font-bold text-[#4d32d4] uppercase">
              Daily challenge
            </p>
            <p className="mt-2 text-lg font-bold">
              &ldquo;Tell us about yourself&rdquo;
            </p>
            <p className="mt-1 text-xs text-[#625b6d]">
              30-45 seconds. Focus on pronunciation and fluency.
            </p>
            {current ? (
              <Link
                href={`/practice/speaking/${current.slug}`}
                className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-[#4d32d4] bg-white px-4 text-sm font-bold text-[#4d32d4] transition active:scale-[0.98]"
              >
                Start Challenge
              </Link>
            ) : null}
          </div>
        </section>

        <SpeakingCatalog items={items} />
      </div>
    </div>
  );
}
