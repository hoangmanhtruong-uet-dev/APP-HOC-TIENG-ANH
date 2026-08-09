import { Bell, BookOpen, Flame, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

import { SKILL_LABELS } from "@/features/analytics/model";
import type { LearnerAnalytics } from "@/server/analytics/content";

const statusStyles = {
  strong: "border-emerald-200 bg-emerald-50 text-emerald-700",
  improving: "border-violet-200 bg-violet-50 text-violet-700",
  practice: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-slate-200 bg-slate-50 text-slate-500",
} as const;

function levelFromBand(band: number | null) {
  if (band === null || band < 4) return "A1";
  if (band < 5) return "A2";
  return "B1";
}

function skillStatus(accuracy: number | null) {
  if (accuracy === null)
    return { label: "Awaiting score", key: "pending" as const };
  if (accuracy >= 70) return { label: "Strong", key: "strong" as const };
  if (accuracy >= 50) return { label: "Improving", key: "improving" as const };
  return { label: "Needs practice", key: "practice" as const };
}

function countActiveDays(analytics: LearnerAnalytics) {
  return new Set(
    analytics.recentActivity.map((activity) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
        new Date(activity.occurredAt),
      ),
    ),
  ).size;
}

export function ProgressAnalytics({
  analytics,
  currentBand,
}: {
  analytics: LearnerAnalytics;
  currentBand: number | null;
}) {
  const { overview } = analytics;
  const level = levelFromBand(currentBand);
  const activeDays = countActiveDays(analytics);
  const scoredSkills = analytics.skills.filter(
    (skill) => skill.accuracyPercent !== null,
  );
  const strengths = scoredSkills.filter(
    (skill) => (skill.accuracyPercent ?? 0) >= 70,
  );
  const improvement = scoredSkills.toSorted(
    (a, b) => (a.accuracyPercent ?? 100) - (b.accuracyPercent ?? 100),
  )[0];

  return (
    <div className="min-h-[100dvh] bg-white px-4 pt-4 pb-7 sm:px-6 lg:mx-auto lg:min-h-[calc(100dvh-4.5rem)] lg:max-w-3xl lg:rounded-2xl lg:border lg:border-[var(--border)] lg:px-8 lg:py-7 lg:shadow-[0_18px_50px_rgb(var(--shadow-color)/0.06)]">
      <header className="flex min-h-12 items-center border-b border-[var(--border)] pb-3 lg:border-0">
        <div className="grid size-9 place-items-center rounded-full bg-amber-100 text-sm font-bold">
          IS
        </div>
        <p className="ml-3 flex-1 text-sm font-bold text-[var(--primary)]">
          Indigo Scholar
        </p>
        <Link
          href="/settings"
          aria-label="Open settings"
          className="grid size-10 place-items-center rounded-xl text-[var(--primary)] hover:bg-[var(--primary-subtle)]"
        >
          <Bell size={18} />
        </Link>
      </header>

      <section className="mt-5">
        <h1 className="text-2xl font-extrabold tracking-[-0.04em]">
          Your Progress
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          See how your English improves over time.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric
            label="Level"
            value={`${level} Beginner`}
            icon={<BookOpen size={18} />}
          />
          <Metric
            label="Overall progress"
            value={`${Math.round(overview.lessonProgressPercent)}%`}
            icon={<TrendingUp size={18} />}
          />
          <Metric
            label="Active days"
            value={String(activeDays)}
            icon={<Flame size={18} />}
          />
          <Metric
            label="Lessons"
            value={String(overview.lessonCompleted)}
            icon={<BookOpen size={18} />}
          />
        </div>
      </section>

      <section className="mt-7" aria-labelledby="skill-breakdown">
        <h2 id="skill-breakdown" className="text-base font-extrabold">
          Skill Breakdown
        </h2>
        <div className="mt-3 space-y-3">
          {analytics.skills.map((skill) => {
            const status = skillStatus(skill.accuracyPercent);
            const percent = skill.accuracyPercent ?? 0;
            return (
              <article
                key={skill.skill}
                className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_5px_16px_rgb(var(--shadow-color)/0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold">
                      {SKILL_LABELS[skill.skill]}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {skill.activityCount} saved activities
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${statusStyles[status.key]}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <strong className="text-2xl tabular-nums">
                    {skill.accuracyPercent === null ? "—" : `${percent}%`}
                  </strong>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-[var(--border)] bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">Recent Activity</h2>
          <span className="text-xs text-[var(--muted-foreground)]">
            {analytics.recentActivity.length} items
          </span>
        </div>
        {analytics.recentActivity.length ? (
          <ol className="mt-3 divide-y divide-[var(--border)]">
            {analytics.recentActivity.slice(0, 5).map((item) => (
              <li
                key={`${item.activityType}-${item.entityId}`}
                className="py-3"
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <TrendingUp size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {item.skill} · {item.status}
                    </span>
                  </span>
                  {item.score !== null && item.maxScore !== null ? (
                    <strong className="text-xs">
                      {item.score}/{item.maxScore}
                    </strong>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-lg bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
            Complete a lesson to start building your activity history.
          </p>
        )}
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <Sparkles size={17} />
            <h2 className="text-sm font-extrabold">Your Strengths</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-emerald-900">
            {strengths.length
              ? strengths.map((item) => SKILL_LABELS[item.skill]).join(" · ")
              : "More scored practice is needed before strengths can be identified."}
          </p>
        </section>
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-center gap-2 text-violet-700">
            <TrendingUp size={17} />
            <h2 className="text-sm font-extrabold">Focus Next</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-violet-900">
            {improvement
              ? `${SKILL_LABELS[improvement.skill]} is your next data-backed focus area.`
              : "Finish two scored activities in a skill to unlock a recommendation."}
          </p>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[#fbf9ff] p-4">
      <div className="text-[var(--primary)]">{icon}</div>
      <p className="mt-3 text-[10px] font-bold tracking-wider text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </article>
  );
}
