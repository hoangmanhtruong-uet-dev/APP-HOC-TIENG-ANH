import {
  BookOpen,
  ChevronRight,
  Clock3,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import type { GrammarTopic } from "@/server/learning/foundations";

export function GrammarCatalog({ topics }: { topics: GrammarTopic[] }) {
  if (topics.length === 0) {
    return (
      <EmptyState
        title="Chưa có chủ điểm Grammar đã xuất bản"
        description="Nội dung mới sẽ xuất hiện tại đây sau khi được duyệt."
      />
    );
  }

  return (
    <div className="space-y-7">
      <section aria-labelledby="grammar-essentials-title">
        <h2 id="grammar-essentials-title" className="mb-3 text-base font-bold">
          Beginner Essentials
        </h2>
        <ol className="space-y-3">
          {topics.slice(0, 2).map((topic, index) => (
            <li key={topic.id}>
              <Link
                href={`/learn/grammar/${topic.slug}`}
                className="block rounded-2xl border border-[#e4deef] bg-white p-4 transition hover:border-[#7c5ce6] focus-visible:ring-2 focus-visible:ring-[#6d4aff] focus-visible:outline-none"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f1ebff] text-[#4c31d5]">
                    {index === 0 ? (
                      <BookOpen size={16} />
                    ) : (
                      <UserRound size={16} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="rounded bg-[#eee8ff] px-1.5 py-0.5 text-[10px] font-bold text-[#5338d4]">
                      {topic.difficulty || "A1"}
                    </span>
                    <h3 className="mt-2 font-semibold">{topic.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#746e80]">
                      Learn the foundations with clear examples and practice.
                    </p>
                    <p className="mt-3 flex items-center gap-3 text-[11px] text-[#635c70]">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} /> 12 min
                      </span>
                      <span>5 exercises</span>
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="everyday-sentences-title">
        <h2 id="everyday-sentences-title" className="mb-3 text-base font-bold">
          Everyday Sentences
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[#e4deef] bg-white">
          {topics.slice(2, 4).map((topic) => (
            <Link
              key={topic.id}
              href={`/learn/grammar/${topic.slug}`}
              className="flex min-h-16 items-center gap-3 border-b border-[#eee9f5] px-4 last:border-0"
            >
              <BookOpen size={16} className="text-[#5638d8]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{topic.title}</p>
                <p className="text-xs text-[#777187]">10 min · 4 exercises</p>
              </div>
              <ChevronRight size={17} className="text-[#aca6b5]" />
            </Link>
          ))}
          <div className="flex min-h-16 items-center gap-3 bg-[#f7f5fa] px-4 text-[#6b6476]">
            <LockKeyhole size={16} />
            <div className="flex-1">
              <p className="text-sm font-semibold">Building Better Sentences</p>
              <p className="text-xs">Complete previous lessons</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
