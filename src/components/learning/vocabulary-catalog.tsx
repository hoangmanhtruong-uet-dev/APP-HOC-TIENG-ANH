import { Bookmark, ChevronRight, Headphones, Volume2 } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import type { VocabularyEntry } from "@/server/learning/foundations";

const topicIcons = [Headphones, Volume2, Bookmark];

export function VocabularyCatalog({ entries }: { entries: VocabularyEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Chưa có từ vựng đã xuất bản"
        description="Nội dung mới sẽ xuất hiện tại đây sau khi được duyệt."
      />
    );
  }

  const topics = Array.from(new Set(entries.map((entry) => entry.topic))).slice(
    0,
    3,
  );

  return (
    <div className="space-y-7">
      <section aria-labelledby="vocabulary-categories-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="vocabulary-categories-title" className="text-base font-bold">
            Explore Categories
          </h2>
          <ChevronRight className="text-[var(--primary)]" size={18} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#e6e0f2] bg-white">
          {topics.map((topic, index) => {
            const Icon = topicIcons[index] ?? Bookmark;
            const count = entries.filter(
              (entry) => entry.topic === topic,
            ).length;
            return (
              <div
                key={topic}
                className="flex min-h-14 items-center gap-3 border-b border-[#eee9f5] px-4 last:border-0"
              >
                <span className="grid size-8 place-items-center rounded-full bg-[#f1ebff] text-[#4d32d8]">
                  <Icon aria-hidden="true" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{topic}</p>
                  <p className="text-xs text-[#777187]">{count} words</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="todays-words-title">
        <h2 id="todays-words-title" className="mb-3 text-base font-bold">
          Today&apos;s Words
        </h2>
        <ol className="space-y-3">
          {entries.slice(0, 3).map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/learn/vocabulary/${entry.slug}`}
                className="block rounded-2xl border border-[#e5deef] bg-white p-4 transition hover:border-[#8b5cf6] focus-visible:ring-2 focus-visible:ring-[#6d4aff] focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#2e19b7]">
                      {entry.term}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#6f687a]">
                      {entry.partOfSpeech}
                    </p>
                  </div>
                  <Bookmark
                    aria-hidden="true"
                    size={18}
                    className="text-[#4d32d8]"
                  />
                </div>
                <blockquote className="mt-4 border-l-2 border-[#5b3ee4] pl-3 text-sm leading-6 text-[#4d4858] italic">
                  “{entry.exampleSentence}”
                </blockquote>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
