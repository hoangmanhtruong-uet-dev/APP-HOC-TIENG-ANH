import {
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";

import type { ListeningCatalogItem } from "@/server/listening/content";

export function ListeningCatalog({ items }: { items: ListeningCatalogItem[] }) {
  if (!items.length)
    return (
      <div className="rounded-2xl border border-[#e3ddec] bg-white p-6">
        <h2 className="font-bold">No published Listening lessons yet</h2>
      </div>
    );
  const icons = [MessagesSquare, MapPin, Headphones];
  return (
    <div className="space-y-7">
      <section>
        <h2 className="mb-3 text-base font-bold">Today&apos;s Practice</h2>
        <ol className="overflow-hidden rounded-2xl border border-[#e3ddec] bg-white">
          {items.slice(0, 2).map((item, index) => (
            <li key={item.slug}>
              <Link
                href={`/practice/listening/${item.slug}`}
                className="flex min-h-16 items-center gap-3 border-b border-[#ece7f1] px-4 last:border-0"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-[#eee8ff] text-[#4d32d4]">
                  {index ? (
                    <MessagesSquare size={17} />
                  ) : (
                    <Headphones size={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#756e80]">
                    <Clock3 size={11} />
                    {Math.round(item.timeLimitSeconds / 60)} min ·{" "}
                    {item.questionCount} activities
                  </p>
                </div>
                <ChevronRight size={16} className="text-[#aaa3b4]" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="mb-3 text-base font-bold">Categories</h2>
        <div className="space-y-3">
          {items.slice(0, 3).map((item, index) => {
            const Icon = icons[index] ?? Headphones;
            const category =
              index === 0
                ? "Daily Conversations"
                : index === 1
                  ? "Introductions"
                  : "Food & Drinks";
            return (
              <Link
                key={`${item.slug}-${category}`}
                href={`/practice/listening/${item.slug}`}
                className="block rounded-2xl border border-[#e3ddec] bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#eee8ff] text-[#4d32d4]">
                    <Icon size={17} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{category}</p>
                    <p className="text-xs text-[#756e80]">
                      {item.questionCount} lessons
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#4d32d4]">
                    {index === 1 ? "100%" : index === 0 ? "80%" : "20%"}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9e4ef]">
                  <div
                    className="h-full rounded-full bg-[#42c996]"
                    style={{
                      width: index === 1 ? "100%" : index === 0 ? "80%" : "20%",
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
