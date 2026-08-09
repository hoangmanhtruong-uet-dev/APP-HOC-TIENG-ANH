import {
  ArrowRight,
  Clock3,
  ImageIcon,
  ListChecks,
  PenLine,
  Type,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import type { WritingCatalogItem } from "@/server/writing/content";

const categoryIcons = [Type, UserRound, ListChecks, ImageIcon];

export function WritingCatalog({ items }: { items: WritingCatalogItem[] }) {
  if (!items.length) {
    return (
      <section className="rounded-2xl border border-dashed border-[#d9d1e6] bg-white p-6 text-center">
        <PenLine aria-hidden="true" className="mx-auto text-[#4d32d4]" />
        <h2 className="mt-3 font-bold">No published Writing tasks yet</h2>
        <p className="mt-1 text-sm text-[#736c7e]">
          New practice tasks will appear here when they are ready.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-bold">Practice Categories</h2>
      <div className="space-y-3">
        {items.map((item, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <article
              key={item.slug}
              className="rounded-2xl border border-[#e3ddec] bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1edff] text-[#4d32d4]">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#736c7e]">
                        {item.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#f3efff] px-2 py-1 text-[9px] font-bold text-[#4d32d4]">
                      {item.difficulty}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#736c7e]">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 aria-hidden="true" size={12} />
                      {Math.round(item.timeLimitSeconds / 60)} min
                    </span>
                    <span>{item.minimumWords} words minimum</span>
                    <span>
                      {item.taskType === "task_2" ? "Essay" : "Report"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/practice/writing/${item.slug}`}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4d32d4] px-4 text-sm font-bold text-white transition active:scale-[0.98]"
                >
                  {item.activeDraftId ? "Continue" : "Start"}
                  <ArrowRight aria-hidden="true" size={15} />
                </Link>
                {item.latestSubmissionId ? (
                  <Link
                    href={`/practice/writing/${item.slug}/submission/${item.latestSubmissionId}`}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-[#d8d0e5] px-4 text-sm font-bold text-[#4d32d4]"
                  >
                    Feedback
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
