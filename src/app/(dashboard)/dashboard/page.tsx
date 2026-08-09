import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  BookOpenText,
  Clock3,
  Headphones,
  Languages,
  Mic2,
  Play,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getAccountLabel } from "@/server/auth/account";
import { getLearningOverview } from "@/server/learning/content";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Student dashboard",
  description: "Your English learning plan for today.",
};

const planItems = [
  {
    title: "Vocabulary",
    detail: "Everyday words",
    href: "/learn/vocabulary",
    icon: BookOpenText,
  },
  {
    title: "Grammar",
    detail: "Foundation practice",
    href: "/learn/grammar",
    icon: Languages,
  },
  {
    title: "Listening",
    detail: "Daily conversations",
    href: "/practice/listening",
    icon: Headphones,
  },
  {
    title: "Speaking",
    detail: "Pronunciation practice",
    href: "/practice/speaking",
    icon: Mic2,
  },
] as const;

function getLevel(band: number | null) {
  if (band === null || band < 4) return { code: "A1", label: "Beginner" };
  if (band < 5) return { code: "A2", label: "Elementary" };
  return { code: "B1", label: "Intermediate" };
}

function weeklyTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export default async function DashboardPage() {
  const [{ account, learnerProfile }, overview] = await Promise.all([
    requireCompletedOnboarding(),
    getLearningOverview(),
  ]);
  const accountLabel = getAccountLabel(account);
  const firstName = accountLabel.trim().split(/\s+/).at(-1) ?? accountLabel;
  const level = getLevel(learnerProfile.current_band);
  const dailyMinutes = learnerProfile.daily_study_minutes ?? 20;
  const nextLesson = overview.continueLesson ?? overview.nextLesson;
  const progress = Math.round(nextLesson?.progressPercent ?? 0);

  return (
    <div className="min-h-[100dvh] bg-white px-4 pt-4 pb-6 sm:px-6 lg:min-h-[calc(100dvh-4.5rem)] lg:rounded-2xl lg:border lg:border-[var(--border)] lg:px-8 lg:py-7 lg:shadow-[0_18px_50px_rgb(var(--shadow-color)/0.06)]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex min-h-12 items-center gap-3 border-b border-[var(--border)] pb-3 lg:border-0">
          <Link
            href="/profile"
            prefetch={false}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-sm font-bold text-[var(--primary)]"
          >
            {accountLabel.slice(0, 1).toUpperCase()}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-[var(--primary)]">
              Good morning, {firstName} 👋
            </h1>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              Ready to make progress today?
            </p>
          </div>
          <Link
            href="/profile"
            prefetch={false}
            aria-label="Open profile and settings"
            className="grid size-10 place-items-center rounded-xl text-[var(--primary)] hover:bg-[var(--primary-subtle)]"
          >
            <Bell size={18} />
          </Link>
        </header>

        <section
          className="mt-4 grid grid-cols-3 gap-2.5 lg:max-w-lg"
          aria-label="Learning summary"
        >
          <Metric
            icon={<BookOpenCheck size={18} />}
            value={String(overview.completedLessons)}
            label="Lessons"
          />
          <Metric
            icon={
              <span className="rounded bg-[var(--primary-subtle)] px-2 py-1 text-[10px] font-bold">
                {level.code}
              </span>
            }
            value={level.label}
            label="Level"
          />
          <Metric
            icon={<Clock3 size={18} />}
            value={weeklyTime(
              dailyMinutes * (learnerProfile.study_days_per_week ?? 5),
            )}
            label="Study time"
          />
        </section>

        <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <section>
            <h2 className="text-lg font-extrabold">Continue Learning</h2>
            {nextLesson ? (
              <article className="mt-3 rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgb(var(--shadow-color)/0.055)] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-[var(--primary)] uppercase">
                      {nextLesson.moduleTitle}
                    </p>
                    <h3 className="mt-2 text-lg font-extrabold">
                      {nextLesson.title}
                    </h3>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Clock3 size={14} />
                    {nextLesson.estimatedMinutes} min
                  </span>
                </div>
                <div className="mt-4 flex justify-between text-xs">
                  <span>Progress</span>
                  <strong className="text-[var(--primary)]">{progress}%</strong>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(4, progress)}%` }}
                  />
                </div>
                <Link
                  href={nextLesson.href}
                  prefetch={false}
                  className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-sm font-bold text-white"
                >
                  Resume lesson <ArrowRight size={17} />
                </Link>
              </article>
            ) : (
              <article className="mt-3 rounded-xl border border-[var(--border)] p-5">
                <Target className="text-[var(--primary)]" size={22} />
                <h3 className="mt-3 font-bold">Start your first lesson</h3>
                <Link
                  href="/learn"
                  prefetch={false}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-bold text-white"
                >
                  Open library <ArrowRight size={17} />
                </Link>
              </article>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-extrabold">Today’s Learning Plan</h2>
              <Link
                href="/learn"
                prefetch={false}
                className="text-xs font-bold text-[var(--primary)]"
              >
                View full plan
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {planItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className="flex min-h-[4.25rem] items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-[0_5px_16px_rgb(var(--shadow-color)/0.04)]"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)]">
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">{item.title}</strong>
                      <span className="block truncate text-[11px] text-[var(--muted-foreground)]">
                        {item.detail} ·{" "}
                        {Math.max(5, Math.round(dailyMinutes / 4))} min
                      </span>
                    </span>
                    <span className="grid size-8 place-items-center rounded-full border border-[var(--border)] text-[var(--primary)]">
                      <Play size={13} fill="currentColor" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-white px-2 py-4 text-center shadow-[0_6px_18px_rgb(var(--shadow-color)/0.045)]">
      <div className="mx-auto grid h-6 place-items-center text-[var(--primary)]">
        {icon}
      </div>
      <p className="mt-2 truncate text-sm font-extrabold">{value}</p>
      <p className="mt-1 text-[9px] font-bold tracking-wider text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
    </article>
  );
}
