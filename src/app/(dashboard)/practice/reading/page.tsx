import {
  Bell,
  BookOpenText,
  Clock3,
  FileText,
  Gauge,
  TimerReset,
  Focus,
  BookA,
  Search,
  Filter,
  Flame,
  Bookmark,
  Library,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Eye,
  CheckCircle2
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ReadingCatalog } from "@/features/reading/components/reading-catalog";
import { getRecentAttemptHistory } from "@/features/practice/server/content";
import { getReadingCatalog } from "@/features/reading/server/content";

export const metadata: Metadata = { title: "Reading Dashboard" };

export default async function ReadingCatalogPage() {
  const [items, history] = await Promise.all([
    getReadingCatalog(),
    getRecentAttemptHistory(100),
  ]);
  const attempts = history.filter((item) => item.domain === "reading");
  const score = attempts.reduce((sum, item) => sum + item.score, 0);
  const maximum = attempts.reduce((sum, item) => sum + item.maxScore, 0);
  const progress = maximum ? Math.round((score / maximum) * 100) : 0;
  const current = items[0];

  return (
    <div className="mx-auto min-h-[100dvh] pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-8 sm:p-10 text-white shadow-xl mb-8">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
           <BookOpenText size={300} />
        </div>
        
        <header className="relative z-10 flex items-center justify-between mb-8">
          <div>
            <p className="text-emerald-200 text-sm font-medium">Good morning,</p>
            <p className="text-2xl font-black">Scholar</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
               <Flame className="text-orange-400" size={18} fill="currentColor" />
               <span className="font-bold text-sm">3 Days</span>
             </div>
             <div className="relative">
               <Bell size={22} className="text-emerald-100 hover:text-white cursor-pointer transition-colors" />
               <span className="absolute -top-1 -right-1 flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
               </span>
             </div>
          </div>
        </header>

        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-end">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
              Expand your mind <br/>through reading.
            </h1>
            <p className="text-emerald-100/80 max-w-md">Master complex texts, build vocabulary, and improve comprehension speed.</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
             <div className="flex justify-between items-end mb-3">
               <div>
                 <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Reading Goal</p>
                 <p className="text-2xl font-black">2 <span className="text-base font-medium text-emerald-200">/ 3 articles</span></p>
               </div>
               <div className="text-right">
                 <strong className="text-3xl font-black text-amber-400">{progress}%</strong>
                 <p className="text-xs font-bold text-emerald-200 uppercase mt-1">Comprehension</p>
               </div>
             </div>
             <div className="h-2.5 w-full bg-emerald-950/50 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" style={{ width: '66%' }}></div>
             </div>
          </div>
        </div>
      </section>

      <main className="space-y-10 px-4 sm:px-6">
        
        <div className="grid lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-10">
            {/* 1. Nâng cấp Card "Up Next" */}
            {current ? (
              <section>
                <h2 className="mb-4 text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" /> Continue Reading
                </h2>
                <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 p-4">
                    <Bookmark size={24} className="text-slate-300 group-hover:text-amber-400 transition-colors" fill="transparent" />
                  </div>
                  <div className="p-6 sm:p-8">
                    <span className="inline-block rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-amber-700 uppercase mb-4">
                      Up Next
                    </span>
                    <h3 className="text-2xl font-black text-slate-800 mb-3">{current.title}</h3>
                    
                    {/* Tags & Metadata */}
                    <div className="flex flex-wrap items-center gap-3 mb-6 text-sm font-bold text-slate-600">
                      <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
                        <Clock3 size={16} className="text-emerald-600" /> 5 mins read
                      </span>
                      <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
                        <FileText size={16} className="text-emerald-600" /> 420 words
                      </span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">#Environment</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">#Case Study</span>
                    </div>

                    {/* Vocab Indicator */}
                    <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <BookA size={24} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-1">Vocabulary Difficulty</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-orange-600 uppercase">Intermediate (B2)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          <span className="text-xs font-medium text-slate-500">8 Key Terms</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/practice/reading/${current.slug}`}
                      className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 font-black text-white hover:bg-emerald-700 hover:scale-[1.02] transition-all shadow-md"
                    >
                      Read Article <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            {/* 2. Reading Modes */}
            <section>
              <h2 className="mb-4 text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <Gauge className="text-emerald-600" /> Reading Modes
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="mb-3 w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <TimerReset size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 mb-1">Timed Exam Mode</h3>
                  <p className="text-xs text-slate-500">Practice under IELTS/TOEFL time pressure.</p>
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="mb-3 w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Eye size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 mb-1">Speed Reading</h3>
                  <p className="text-xs text-slate-500">RSVP pacing to train fast reading & skim skills.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="mb-3 w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Focus size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 mb-1">Focus / Bilingual</h3>
                  <p className="text-xs text-slate-500">Relaxed reading for vocab acquisition.</p>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-10">
            {/* 4. Personalized Vocabulary Vault */}
            <section className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-5 -mt-4 -mr-4">
                <BrainCircuit size={120} />
              </div>
              <div className="relative z-10">
                <h2 className="text-lg font-black text-indigo-900 mb-1">Vocabulary Vault</h2>
                <p className="text-sm text-indigo-700/70 mb-6 font-medium">Saved Words from Reading</p>
                
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <span className="text-4xl font-black text-indigo-600">128</span>
                    <span className="text-sm font-bold text-indigo-400 block">Total Saved</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-500 flex items-center justify-end gap-1"><CheckCircle2 size={16}/> 42</span>
                    <span className="text-sm font-bold text-indigo-400 block">Mastered</span>
                  </div>
                </div>

                <button className="w-full min-h-12 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
                  Review 10 Flashcards
                </button>
              </div>
            </section>
          </div>

        </div>

        {/* 3. Tối ưu danh sách Categories */}
        <section className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <Library className="text-emerald-600" /> Article Library
            </h2>
            
            {/* Mock Filter & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search topics..." className="w-full sm:w-48 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
              <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 transition-colors">
                <Filter size={18} />
              </button>
            </div>
          </div>
          
          <ReadingCatalog items={items} />
        </section>

      </main>
    </div>
  );
}
