import {
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  MessagesSquare,
  BarChart,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

import type { ListeningCatalogItem } from "@/features/listening/server/content";

export function ListeningCatalog({ items }: { items: ListeningCatalogItem[] }) {
  if (!items.length)
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
        <Headphones className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">No published lessons yet</h2>
        <p className="text-sm text-zinc-500">Check back later for new content.</p>
      </div>
    );
  
  const icons = [MessagesSquare, MapPin, Headphones];
  
  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Today&apos;s Practice</h2>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
            View all <ChevronRight size={16} />
          </button>
        </div>
        
        <ol className="grid gap-4 md:grid-cols-2">
          {items.slice(0, 2).map((item, index) => (
            <li key={item.slug}>
              <Link
                href={`/practice/listening/${item.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 md:p-8 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="flex gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                      New
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-600 tracking-wide">
                      🇬🇧 UK Accent
                    </span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    {index ? <MessagesSquare size={20} /> : <Headphones size={20} />}
                  </div>
                </div>
                
                <div className="mb-6 relative z-10">
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-900 mb-2 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                  <div className="flex items-center gap-4 text-sm font-medium text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={16} className="text-zinc-400" />
                      {Math.round(item.timeLimitSeconds / 60)}m 30s
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart size={16} className="text-zinc-400" />
                      {item.questionCount} Questions
                    </span>
                  </div>
                </div>

                {/* Simulated Waveform Preview on Hover */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-50 to-transparent flex items-end gap-[2px] px-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-indigo-100 rounded-t-sm origin-bottom" 
                      style={{ 
                        height: `${Math.max(10, 20 + Math.random() * 80)}%`, 
                        transition: 'height 0.3s ease', 
                        transitionDelay: `${i * 0.01}s` 
                      }}
                    ></div>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="pt-4 border-t border-zinc-100">
        <h2 className="mb-6 text-xl font-semibold tracking-tight text-zinc-900">Topics & Categories</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {items.slice(0, 3).map((item, index) => {
            const Icon = icons[index] ?? Headphones;
            const category =
              index === 0
                ? "Daily Conversations"
                : index === 1
                  ? "Introductions"
                  : "Food & Drinks";
            
            const isMastered = index === 1;
            const progress = index === 1 ? "100%" : index === 0 ? "80%" : "20%";

            return (
              <Link
                key={`${item.slug}-${category}`}
                href={`/practice/listening/${item.slug}`}
                className="group block rounded-[1.5rem] border border-zinc-200 bg-white p-6 hover:shadow-lg hover:shadow-zinc-200/50 hover:border-zinc-300 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                    <Icon size={20} />
                  </div>
                  {isMastered ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                      <CheckCircle2 size={14} /> Mastered
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                      In Progress
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold tracking-tight text-zinc-900 mb-1">{category}</h3>
                <p className="text-sm font-medium text-zinc-500 mb-6">
                  {item.questionCount} lessons available
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${isMastered ? 'bg-emerald-500' : 'bg-zinc-900'}`}
                      style={{ width: progress }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 tabular-nums">{progress}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
