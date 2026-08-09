import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Mic2,
  Repeat2,
  Volume2,
} from "lucide-react";
import Link from "next/link";

import type { SpeakingCatalogItem } from "@/server/speaking/content";

const categoryIcons = [Repeat2, Volume2, BookOpen, MessageCircle];
const categoryNames = [
  "Repeat After Me",
  "Pronunciation",
  "Read Aloud",
  "Answer a Question",
];

export function SpeakingCatalog({ items }: { items: SpeakingCatalogItem[] }) {
  if (!items.length) {
    return (
      <section className="rounded-2xl border border-dashed border-[#d9d1e6] bg-white p-6 text-center">
        <Mic2 aria-hidden="true" className="mx-auto text-[#4d32d4]" />
        <h2 className="mt-3 font-bold">No published Speaking sets yet</h2>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-bold">Practice Categories</h2>
      <div className="overflow-hidden rounded-2xl border border-[#e3ddec] bg-white">
        {items.map((item, index) => {
          const Icon = categoryIcons[index % categoryIcons.length];
          return (
            <div
              key={item.slug}
              className="border-b border-[#ece7f1] p-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1edff] text-[#4d32d4]">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {categoryNames[index % categoryNames.length]}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#736c7e]">
                    {item.title} · {item.promptCount} prompts
                  </p>
                </div>
                <Link
                  href={`/practice/speaking/${item.slug}`}
                  aria-label={`Open ${item.title}`}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-[#ddd5e9] text-[#4d32d4] transition active:scale-[0.96]"
                >
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </div>
              {item.latestAttemptId ? (
                <Link
                  href={`/practice/speaking/${item.slug}/attempt/${item.latestAttemptId}`}
                  className="mt-3 block text-right text-xs font-bold text-[#4d32d4] underline-offset-4 hover:underline"
                >
                  View latest feedback
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
