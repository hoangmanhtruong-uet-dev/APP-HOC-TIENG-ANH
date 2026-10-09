import {
  BookOpenText,
  Newspaper,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import type { ReadingCatalogItem } from "@/features/reading/server/content";

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categoryNames.map((name, index) => {
        const item = items[index % items.length];
        const Icon = icons[index] ?? BookOpenText;
        const width = [82, 46, 18, 0][index];
        
        // Mock data for new requirements
        const cefrLevels = [
          { label: "A2 Basic", color: "bg-blue-100 text-blue-700 border-blue-200" },
          { label: "B2 Intermediate", color: "bg-orange-100 text-orange-700 border-orange-200" },
          { label: "C1 Advanced", color: "bg-purple-100 text-purple-700 border-purple-200" },
          { label: "A2 Basic", color: "bg-blue-100 text-blue-700 border-blue-200" },
        ];
        const cefr = cefrLevels[index];
        const stats = ["10/12", "5/11", "2/15", "0/8"][index];

        return (
          <Link
            key={name}
            href={`/practice/reading/${item.slug}`}
            className="group block rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Icon size={24} />
              </span>
              <span className={`px-2 py-1 text-[10px] font-black uppercase rounded-md border ${cefr.color}`}>
                {cefr.label}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">{name}</h3>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500">{stats} articles read</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600">{width}%</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
