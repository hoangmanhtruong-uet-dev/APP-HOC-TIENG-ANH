import {
  Bell,
  Headphones,
  Flame,
  ChevronDown,
  Activity,
  Mic,
  Globe2,
  ListTodo,
  ArrowRight,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  Sparkles,
  Waves,
  AudioLines
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListeningCatalog } from "@/features/listening/components/listening-catalog";
import { getListeningCatalog } from "@/features/listening/server/content";
import { getRecentAttemptHistory } from "@/features/practice/server/content";

export const metadata: Metadata = { title: "Listening Dashboard" };

export default async function ListeningCatalogPage() {
  const [items, history] = await Promise.all([
    getListeningCatalog(),
    getRecentAttemptHistory(100),
  ]);
  const attempts = history.filter((item) => item.domain === "listening");
  const score = attempts.reduce((sum, item) => sum + item.score, 0);
  const maximum = attempts.reduce((sum, item) => sum + item.maxScore, 0);
  const progress = maximum ? Math.round((score / maximum) * 100) : 0;

  return (
    <div className="mx-auto min-h-[100dvh] pb-48 md:pb-32 font-sans selection:bg-indigo-500/30">
      {/* 1. Hero / Header Section - Cinematic & Restrained */}
      <section className="relative mb-12 overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-12 md:px-12 lg:py-20 text-white shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />
        
        <header className="relative z-10 flex items-center justify-between mb-12 md:mb-16">
          <div>
            <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase mb-1">Welcome back</p>
            <p className="text-2xl font-medium tracking-tight">Scholar</p>
          </div>
          <div className="flex items-center gap-5">
             <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 cursor-default">
               <Flame className="text-orange-400" size={16} fill="currentColor" />
               <span className="font-semibold text-sm tracking-wide">5 Days</span>
             </div>
             <button className="relative group p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors">
               <Bell size={20} className="text-zinc-300 group-hover:text-white transition-colors" />
               <span className="absolute top-2 right-2 flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
               </span>
             </button>
          </div>
        </header>

        <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 mb-6">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold tracking-wide text-indigo-300 uppercase">IELTS Band 6.0+</span>
              <ChevronDown size={14} className="text-indigo-400 ml-1 cursor-pointer hover:text-white transition-colors" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-semibold tracking-tighter mb-6 leading-[1.05]">
              Master real-world <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300">English listening.</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-[45ch] leading-relaxed">
              Immerse yourself in authentic conversations, academic lectures, and diverse accents to build natural comprehension.
            </p>
          </div>

          <div className="lg:col-span-5 w-full flex lg:justify-end">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-500">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <div className="flex justify-between items-start mb-6 relative z-10">
                 <div>
                   <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-2">Daily Goal</p>
                   <p className="text-3xl font-medium tracking-tight">15<span className="text-lg text-zinc-500 ml-1">/ 20m</span></p>
                 </div>
                 <div className="text-right">
                   <p className="text-3xl font-medium tracking-tight text-emerald-400">{progress}%</p>
                   <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-2">Accuracy</p>
                 </div>
               </div>
               <div className="h-2 w-full bg-zinc-800/50 rounded-full overflow-hidden relative z-10">
                 <div 
                   className="h-full bg-emerald-400 rounded-full relative" 
                   style={{ width: '75%' }}
                 >
                   <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <main className="space-y-16 px-2 md:px-0">
        
        {/* 2. Listening Modes - Bento Grid Approach */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-3">
              <AudioLines className="text-indigo-500" size={24} /> 
              Listening Modes
            </h2>
          </div>
          
          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-4 auto-rows-[180px]">
            
            {/* Dictation - Spans 2 columns on large screens for emphasis */}
            <Link href="/practice/listening/dictation" className="group lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-zinc-50 p-8 hover:bg-zinc-100 transition-colors border border-zinc-200/50 flex flex-col justify-between">
              <div className="absolute right-0 top-0 p-8 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 text-amber-500">
                <Mic size={64} strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-200/50 text-amber-600 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <Mic size={24} />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 tracking-tight mb-2">Deep Dictation</h3>
                <p className="text-sm text-zinc-500 max-w-[25ch] leading-relaxed">Transcribe audio sentence by sentence for absolute precision.</p>
              </div>
              <ArrowRight size={20} className="text-zinc-300 self-end group-hover:text-amber-500 group-hover:translate-x-2 transition-all duration-300" />
            </Link>

            <article className="group relative overflow-hidden rounded-[2rem] bg-zinc-50 p-6 hover:bg-zinc-100 transition-colors border border-zinc-200/50 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-zinc-200/50 text-rose-500 mb-4 group-hover:scale-110 transition-transform">
                  <Activity size={20} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 tracking-tight mb-2">Speed Run</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Train your brain at 1.25x - 1.5x speeds.</p>
              </div>
              <ArrowRight size={18} className="text-zinc-300 self-end group-hover:text-rose-500 group-hover:translate-x-1 transition-all duration-300" />
            </article>

            <article className="group relative overflow-hidden rounded-[2rem] bg-zinc-50 p-6 hover:bg-zinc-100 transition-colors border border-zinc-200/50 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-zinc-200/50 text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                  <Globe2 size={20} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 tracking-tight mb-2">Accents</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Master UK, US, and AUS variations.</p>
              </div>
              <ArrowRight size={18} className="text-zinc-300 self-end group-hover:text-sky-500 group-hover:translate-x-1 transition-all duration-300" />
            </article>

            {/* Comprehension - Callout style */}
            <article className="group md:col-span-3 lg:col-span-4 relative overflow-hidden rounded-[2rem] bg-indigo-50 p-8 border border-indigo-100 hover:border-indigo-200 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4">
                <Waves size={200} strokeWidth={1} />
              </div>
              <div className="relative z-10 flex gap-6 items-center">
                <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm text-indigo-600 shrink-0">
                  <ListTodo size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-indigo-950 tracking-tight">Full Comprehension Test</h3>
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  </div>
                  <p className="text-sm text-indigo-900/70 max-w-[50ch] leading-relaxed">Simulate real exam conditions with multi-part audio and diverse question types. Perfect for weekend reviews.</p>
                </div>
              </div>
              <button className="relative z-10 bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold text-sm shadow-sm hover:shadow hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap">
                Start Test <ArrowRight size={16} />
              </button>
            </article>
          </div>
        </section>

        {/* 3. Catalog - Refined List */}
        <section>
          <ListeningCatalog items={items} />
        </section>

      </main>

      {/* 4. Mini-Player - Floating & Glassy */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
        <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-2xl text-white rounded-3xl p-3 md:px-5 md:py-3 shadow-2xl border border-white/10 flex flex-col md:flex-row items-center gap-4 hover:bg-zinc-900 transition-colors duration-300 ring-1 ring-black/5">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group cursor-pointer shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/5">
                <Headphones size={20} className="text-zinc-400" />
              </div>
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                <Play size={18} className="text-white" fill="currentColor" />
              </div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-0.5">Playing</p>
              <p className="text-sm font-medium tracking-tight truncate">Community library visit</p>
            </div>
          </div>

          <div className="flex-1 w-full flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-500 tabular-nums">01:15</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative group">
              <div className="absolute inset-0 bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="h-full bg-white rounded-full relative z-10" style={{ width: '45%' }}></div>
            </div>
            <span className="text-xs font-medium text-zinc-500 tabular-nums">02:45</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Rewind 5s"><RotateCcw size={16} /></button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Previous"><SkipBack size={16} fill="currentColor" /></button>
            <button className="h-10 w-10 bg-white text-zinc-900 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
              <Play size={18} fill="currentColor" className="ml-1" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Next"><SkipForward size={16} fill="currentColor" /></button>
            
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
              <button className="text-[10px] font-bold text-zinc-300 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md transition-colors tabular-nums">1.25x</button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Volume"><Volume2 size={16} /></button>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

