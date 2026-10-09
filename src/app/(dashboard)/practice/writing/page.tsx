import { Bell, PenLine, Flame, TrendingUp, AlertCircle, Quote, RefreshCw, FileText, Mail, FileSignature, Edit3, Target } from "lucide-react";
import type { Metadata } from "next";

import { WritingCatalog } from "@/features/writing/components/writing-catalog";
import {
  getRecentWritingSubmissions,
  getWritingCatalog,
} from "@/features/writing/server/content";

export const metadata: Metadata = {
  title: "Writing Dashboard",
  description: "Practice English writing with saved drafts and AI feedback.",
};

export default async function WritingCatalogPage() {
  const [items, submissions] = await Promise.all([
    getWritingCatalog(),
    getRecentWritingSubmissions(24),
  ]);
  const current = items.find((item) => item.activeDraftId) ?? items.at(0) ?? null;
  const completed = submissions.length;
  const target = Math.max(items.length * 4, completed, 1);
  const progress = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="mx-auto min-h-[100dvh] pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans bg-slate-50">
      
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 p-8 sm:p-10 text-white shadow-xl mb-8 mx-4 sm:mx-6 mt-4">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
           <Edit3 size={300} />
        </div>
        
        <header className="relative z-10 flex items-center justify-between mb-8">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Good evening,</p>
            <p className="text-2xl font-black">Writer</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
               <Flame className="text-orange-400" size={18} fill="currentColor" />
               <span className="font-bold text-sm">5 Days</span>
             </div>
             <div className="relative">
               <Bell size={22} className="text-indigo-100 hover:text-white cursor-pointer transition-colors" />
             </div>
          </div>
        </header>

        <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-5">
            <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
              Craft your words <br/>with precision.
            </h1>
            <p className="text-indigo-200/80 max-w-md">Master grammar, vocabulary, and cohesion through AI-guided writing tasks.</p>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-4">
            {/* 1. Nâng cấp khối Writing Progress & Thống kê */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Target size={14}/> Avg Score</p>
              <div>
                <strong className="text-3xl font-black text-amber-400">6.5</strong>
                <span className="text-indigo-200 text-sm font-medium ml-1">/ 9.0</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileSignature size={14}/> Word Count</p>
              <div>
                <strong className="text-2xl font-black text-white">1,250</strong>
                <span className="text-indigo-200 text-xs block mt-1">/ 3,000 this week</span>
                <div className="h-1.5 w-full bg-indigo-950/50 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-rose-500/20 backdrop-blur-md border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle size={14}/> Top Mistake</p>
              <div>
                <strong className="text-sm font-bold text-white leading-tight">Article Usage (a/an/the)</strong>
                <p className="text-rose-200 text-xs mt-1">Found in 4 recent essays</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="space-y-10 px-4 sm:px-6">
        
        {/* 2. Bổ sung các Chế độ luyện viết (Writing Modes) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <PenLine className="text-indigo-600" /> Writing Modes
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Quote size={20} />
              </div>
              <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Sentence Builder</h3>
              <p className="text-[11px] text-slate-500 font-medium">Master complex structures</p>
            </div>

            <div className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <RefreshCw size={20} />
              </div>
              <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Paraphrasing</h3>
              <p className="text-[11px] text-slate-500 font-medium">Re-write like a native</p>
            </div>

            <div className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 mt-3 mr-3 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Essay / Report</h3>
              <p className="text-[11px] text-slate-500 font-medium">Full academic practice</p>
            </div>

            <div className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Mail size={20} />
              </div>
              <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Daily Email</h3>
              <p className="text-[11px] text-slate-500 font-medium">Workplace communication</p>
            </div>

          </div>
        </section>

        {/* 3. Cải tiến danh sách Practice Categories */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" /> Practice Library
            </h2>
            
            {/* Mock Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
              <button className="px-4 py-2 bg-white text-indigo-700 text-sm font-bold rounded-lg shadow-sm whitespace-nowrap">All Tasks</button>
              <button className="px-4 py-2 text-slate-600 text-sm font-bold rounded-lg hover:text-slate-800 hover:bg-slate-200/50 transition-colors whitespace-nowrap">Academic Essay</button>
              <button className="px-4 py-2 text-slate-600 text-sm font-bold rounded-lg hover:text-slate-800 hover:bg-slate-200/50 transition-colors whitespace-nowrap hidden sm:block">Workplace Email</button>
              <button className="px-4 py-2 text-slate-600 text-sm font-bold rounded-lg hover:text-slate-800 hover:bg-slate-200/50 transition-colors whitespace-nowrap hidden lg:block">Creative</button>
            </div>
          </div>

          <WritingCatalog items={items} />
        </section>

      </main>
    </div>
  );
}
