import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";

import type { IELTSLevelId, IELTSSkill } from "@/content/ielts-roadmap";
import { ROADMAP_SKILL_LABELS } from "@/content/ielts-roadmap";

export function RoadmapBreadcrumb({
  levelId,
  levelTitle,
  skill,
  current,
}: {
  levelId?: IELTSLevelId;
  levelTitle?: string;
  skill?: IELTSSkill;
  current?: string;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <li>
          <Link
            href="/roadmap"
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            Lộ trình
          </Link>
        </li>
        {levelId && levelTitle ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/roadmap/${levelId}`}
                className="inline-flex min-h-11 items-center rounded-md font-semibold hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                {levelTitle}
              </Link>
            </li>
          </>
        ) : null}
        {skill ? (
          <>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-[var(--foreground)]">
              {ROADMAP_SKILL_LABELS[skill]}
            </li>
          </>
        ) : null}
        {current ? (
          <>
            <li aria-hidden="true">/</li>
            <li
              aria-current="page"
              className="max-w-64 truncate font-medium text-[var(--foreground)]"
            >
              {current}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

export function ExerciseCard({
  title,
  instruction,
  expectedOutput,
  minutes,
  answerKey,
  selfCheck,
}: {
  title: string;
  instruction: string;
  expectedOutput: string;
  minutes: number;
  answerKey?: string[];
  selfCheck?: string[];
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
          <Clock3 aria-hidden="true" size={16} />
          {minutes} phút
        </span>
      </div>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
        {instruction}
      </p>
      <div className="mt-4 rounded-lg bg-[var(--muted)] p-4">
        <p className="text-xs font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
          Sản phẩm cần nộp
        </p>
        <p className="mt-1.5 font-medium">{expectedOutput}</p>
      </div>
      {selfCheck?.length ? (
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--primary)]">
            Checklist tự chấm
          </summary>
          <ul className="mt-2 space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
            {selfCheck.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {answerKey?.length ? (
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--primary)]">
            Đáp án tham khảo
          </summary>
          <ul className="mt-2 space-y-2 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
            {answerKey.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold whitespace-nowrap text-white transition-transform hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-px"
    >
      {children}
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}
