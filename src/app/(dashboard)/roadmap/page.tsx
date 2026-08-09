import { Bell, Check, Flame, LockKeyhole, Play, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getRecommendedLevel, IELTS_LEVELS } from "@/content/ielts-roadmap";
import { getAccountLabel } from "@/server/auth/account";
import { getLearningCatalog } from "@/server/learning/content";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Your learning path",
  description: "A level-based path built from your saved progress.",
};
type PathItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  status: "completed" | "current" | "locked";
};

function getLevel(band: number | null) {
  if (band === null || band < 4) return "A1";
  if (band < 5) return "A2";
  return "B1";
}

export default async function RoadmapPage() {
  const [{ account, learnerProfile }, modules] = await Promise.all([
    requireCompletedOnboarding(),
    getLearningCatalog(),
  ]);
  const level = getLevel(learnerProfile.current_band);
  const recommendedLevelId = getRecommendedLevel(learnerProfile.current_band);
  const recommendedIndex = Math.max(
    0,
    IELTS_LEVELS.findIndex((item) => item.id === recommendedLevelId),
  );
  const foundation =
    modules.find((module) => module.skill === "foundations") ?? modules[0];
  const lessons = foundation?.lessons.slice(0, 5) ?? [];
  const currentIndex = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.status !== "completed"),
  );
  const pathItems: PathItem[] = lessons.length
    ? lessons.map((lesson, index) => ({
        id: lesson.id,
        title: lesson.title,
        description:
          lesson.status === "completed"
            ? "Completed"
            : lesson.summary || `${lesson.estimatedMinutes} min`,
        href: lesson.href,
        status:
          lesson.status === "completed"
            ? "completed"
            : index === currentIndex
              ? "current"
              : "locked",
      }))
    : IELTS_LEVELS.slice(0, 5).map((item, index) => ({
        id: item.id,
        title: item.title,
        href: `/roadmap/${item.id}`,
        description:
          index < recommendedIndex
            ? "Completed"
            : index === recommendedIndex
              ? `Band ${item.band.from}-${item.band.to}`
              : "Locked",
        status:
          index < recommendedIndex
            ? "completed"
            : index === recommendedIndex
              ? "current"
              : "locked",
      }));
  const progress = Math.round(
    foundation?.progressPercent ??
      (recommendedIndex / Math.max(1, IELTS_LEVELS.length)) * 100,
  );

  return (
    <div className="min-h-[100dvh] bg-[#fbf9ff] px-4 pt-4 pb-7 sm:px-6 lg:mx-auto lg:min-h-[calc(100dvh-4.5rem)] lg:max-w-2xl lg:rounded-2xl lg:border lg:border-[var(--border)] lg:px-8 lg:py-7 lg:shadow-[0_18px_50px_rgb(var(--shadow-color)/0.06)]">
      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--border)] pb-3 lg:border-0">
        <span className="grid size-9 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
          <UserRound size={18} />
        </span>
        <p className="flex-1 truncate font-bold text-[var(--primary)]">
          Hello, {getAccountLabel(account)}
        </p>
        <Link
          href="/profile"
          aria-label="Open profile and settings"
          className="grid size-10 place-items-center rounded-xl text-[var(--primary)]"
        >
          <Bell size={18} />
        </Link>
      </header>

      <main className="mt-6">
        <h1 className="text-2xl font-extrabold tracking-[-0.04em]">
          Your Learning Path
        </h1>
        <div className="mt-2 flex items-center justify-between text-sm">
          <p className="text-[var(--muted-foreground)]">
            Level {level} · {progress}% complete
          </p>
          <span className="rounded-full bg-[var(--primary)] px-2.5 py-1 text-[10px] font-bold text-white">
            {level}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="mt-5 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
              <Flame size={18} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Keep the momentum!</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                Your saved progress decides which lesson opens next.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-lg font-extrabold">
              {foundation?.title ?? "English Foundations"}
            </h2>
          </div>
          <ol className="relative mt-5 space-y-4 before:absolute before:top-5 before:bottom-5 before:left-[17px] before:w-px before:bg-[var(--primary-soft)]">
            {pathItems.map((item) => (
              <li key={item.id} className="relative flex gap-3">
                <Marker status={item.status} />
                {item.status === "locked" ? (
                  <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--muted)]/55 p-4 text-[var(--muted-foreground)]">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-xs">Locked</p>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`min-w-0 flex-1 rounded-xl border bg-white p-4 shadow-sm ${item.status === "current" ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border)]"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-sm font-extrabold ${item.status === "current" ? "text-[var(--primary)]" : ""}`}
                      >
                        {item.title}
                      </h3>
                      {item.status === "current" ? (
                        <span className="rounded bg-[var(--primary)] px-2 py-0.5 text-[9px] font-bold text-white">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                      {item.description}
                    </p>
                    {item.status === "current" ? (
                      <span className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-xs font-bold text-white">
                        Continue Lesson <Play size={13} fill="currentColor" />
                      </span>
                    ) : null}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

function Marker({ status }: { status: PathItem["status"] }) {
  if (status === "completed")
    return (
      <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
        <Check size={17} />
      </span>
    );
  if (status === "current")
    return (
      <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--primary)] bg-white text-[var(--primary)] ring-4 ring-[#fbf9ff]">
        <Play size={14} fill="currentColor" />
      </span>
    );
  return (
    <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
      <LockKeyhole size={14} />
    </span>
  );
}
