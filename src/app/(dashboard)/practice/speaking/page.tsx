import {
  Mic2,
  Radio,
  Activity,
  BarChart3,
  Flame,
  ArrowRight
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SpeakingCatalog } from "@/features/speaking/components/speaking-catalog";
import {
  getSpeakingDashboardData,
  getSpeakingCatalog,
} from "@/features/speaking/server/content";

export const metadata: Metadata = {
  title: "Speaking",
  description: "Speak fluently with AI feedback and real-world scenarios.",
};

export default async function SpeakingCatalogPage() {
  const [items, attempts] = await Promise.all([
    getSpeakingCatalog(),
    getSpeakingDashboardData(24),
  ]);
  
  const current = items.find((item) => item.activeAttemptId) ?? items.at(0) ?? null;
  const answered = attempts.reduce((sum, item) => sum + item.responseCount, 0);
  const target = Math.max(
    items.reduce((sum, item) => sum + item.promptCount, 0) * 3,
    answered,
    1,
  );
  
  // Real progress metrics
  const progress = Math.min(100, Math.round((answered / target) * 100));
  const latestFeedback = attempts.find((attempt) => attempt.feedback)?.feedback;
  
  const pronunScore = latestFeedback?.estimatedPronunciationBand ?? 0;
  const fluencyScore = latestFeedback?.estimatedFluencyBand ?? 0;
  const vocabScore = latestFeedback?.estimatedLexicalBand ?? 0;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Header & Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-900 via-[#0284C7] to-blue-700 p-8 sm:p-10 text-white shadow-xl">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
           <Mic2 size={300} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-sky-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-100 mb-4 backdrop-blur-md border border-sky-300/30">
              AI Speaking Hub
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
              Speak fluently with AI feedback & real-world scenarios.
            </h1>
            <p className="text-sky-100 text-base sm:text-lg">
              Master your pronunciation, fluency, and vocabulary with instant, multi-dimensional AI evaluation.
            </p>
          </div>

          {/* Microphone Pre-check Widget */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20"></span>
              <Mic2 className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-100">Microphone Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <span className="text-base font-bold text-white">Ready to record</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* 2. Khối 1: Your Speaking Stats */}
        <section className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-extrabold text-[var(--foreground)] flex items-center gap-2">
            <BarChart3 className="text-sky-600" /> Your Speaking Stats
          </h2>
          
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
            {/* Real Radar/Score Chart via Bars */}
            <div className="space-y-5 mb-8">
              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">Pronunciation</span>
                  <span className="text-sky-600">{pronunScore ? `${pronunScore} / 9.0` : "—"}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: pronunScore ? `${(pronunScore / 9) * 100}%` : '0%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">Fluency & Coherence</span>
                  <span className="text-sky-600">{fluencyScore ? `${fluencyScore} / 9.0` : "—"}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: fluencyScore ? `${(fluencyScore / 9) * 100}%` : '0%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">Lexical Resource</span>
                  <span className="text-sky-600">{vocabScore ? `${vocabScore} / 9.0` : "—"}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: vocabScore ? `${(vocabScore / 9) * 100}%` : '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Streak nói */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-500">
                  <Flame size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Speaking Progress</p>
                  <p className="text-lg font-black text-slate-800">{answered} <span className="text-sm font-semibold text-slate-500">/ {target} tasks</span></p>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.max(progress, answered ? 6 : 0)}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Khối 2: Quick Practice Modes */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-extrabold text-[var(--foreground)] flex items-center gap-2">
            <Activity className="text-sky-600" /> Quick Practice Modes
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Pronunciation Lab */}
            <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-sky-300 cursor-pointer flex flex-col justify-between min-h-[160px]">
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <Activity size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-800 group-hover:text-sky-600 transition-colors">Pronunciation Lab</h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">Luyện cặp âm dễ nhầm lẫn (/i:/ vs /ɪ/, /θ/ vs /s/).</p>
              </div>
              <ArrowRight size={18} className="text-slate-300 self-end group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
            </article>

            {/* Shadowing */}
            <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-sky-300 cursor-pointer flex flex-col justify-between min-h-[160px]">
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Radio size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-800 group-hover:text-sky-600 transition-colors">Shadowing</h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">Nghe và nhại lại câu văn theo nhịp điệu bản xứ.</p>
              </div>
              <ArrowRight size={18} className="text-slate-300 self-end group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
            </article>

            {/* AI Roleplay (Uses real data) */}
            {current ? (
              <Link href={`/practice/speaking/${current.slug}`} className="group relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm hover:shadow-md transition-all hover:border-sky-400 cursor-pointer flex flex-col justify-between min-h-[160px]">
                <div className="absolute top-0 right-0 p-3">
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                </div>
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-200 text-sky-700">
                    <Mic2 size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors">Current Challenge</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{current.title}</p>
                </div>
                <ArrowRight size={18} className="text-sky-500 self-end group-hover:translate-x-1 transition-all" />
              </Link>
            ) : (
              <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-sky-300 cursor-pointer flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <Mic2 size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-sky-600 transition-colors">AI Roleplay</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">Chat tự do bằng giọng nói với AI Tutor.</p>
                </div>
                <ArrowRight size={18} className="text-slate-300 self-end group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </article>
            )}
          </div>
        </section>

      </div>

      {/* 4. Khối 3: Scenario Topics (Integrating existing Catalog) */}
      <section className="pt-8">
        <h2 className="mb-6 text-2xl font-extrabold text-[var(--foreground)]">Practice Catalog</h2>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
           <SpeakingCatalog items={items} />
        </div>
      </section>

    </div>
  );
}
