import {
  BookOpenText,
  ChevronRight,
  Newspaper,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import type { ReadingCatalogItem } from "@/server/reading/content";

export function ReadingCatalog({ items }: { items: ReadingCatalogItem[] }) {
  if (!items.length)
    return (
      <div className="rounded-2xl border border-[#e3ddec] bg-white p-6">
        <h2 className="font-bold">No published Reading lessons yet</h2>
      </div>
    );
  const categoryNames = [
    "Daily Life",
    "Family",
    "Short Stories",
    "Signs & Notices",
  ];
  const icons = [BookOpenText, UsersRound, Newspaper, BookOpenText];
  return (
    <section>
      <h2 className="mb-3 text-base font-bold">Categories</h2>
      <div className="overflow-hidden rounded-2xl border border-[#e3ddec] bg-white">
        {categoryNames.map((name, index) => {
          const item = items[index % items.length];
          const Icon = icons[index] ?? BookOpenText;
          const width = [82, 46, 18, 0][index];
          return (
            <Link
              key={name}
              href={`/practice/reading/${item.slug}`}
              className="flex min-h-17 items-center gap-3 border-b border-[#ece7f1] px-4 last:border-0"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#f0ebff] text-[#4d32d4]">
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between">
                  <p className="text-sm font-bold">{name}</p>
                  <span className="text-[10px] text-[#756e80]">
                    {item.difficulty}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e9e4ef]">
                  <div
                    className="h-full rounded-full bg-[#39c692]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <ChevronRight size={16} className="text-[#aaa3b4]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
