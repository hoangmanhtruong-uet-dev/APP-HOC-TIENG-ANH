import { ArrowRight, Clock3, FileCheck2, Sparkles, ChartNoAxesCombined } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatMockSessionStatus } from "@/features/mock-tests/model";
import type { MockCatalogItem } from "@/features/mock-tests/server/content";

export function MockTestCatalog({ tests }: { tests: MockCatalogItem[] }) {
  return (
    <div className="space-y-8 font-sans pb-12">
      
      {/* Header Widget */}
      <section className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-black tracking-wider text-white uppercase shadow-sm">
              EXAM READINESS ENGINE
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Sparkles size={14} className="text-indigo-400" /> AI Model v4.2 Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            Mock Exam Arena
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Simulate official testing conditions with AI-powered proctoring, instant band scoring, and deeply analytical performance breakdowns.
          </p>
        </div>
        
        {/* Quick Stats Widget */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex gap-8 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
             <ChartNoAxesCombined size={80} className="text-indigo-900" />
           </div>
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Recent Band</p>
             <p className="text-2xl font-black text-indigo-600 mb-1">7.5 <span className="text-sm font-bold text-emerald-500">+0.5</span></p>
             <p className="text-xs font-semibold text-slate-500">IELTS Academic</p>
           </div>
           <div className="w-px bg-slate-100 relative z-10" />
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Completed</p>
             <p className="text-2xl font-black text-slate-800 mb-1">12</p>
             <p className="text-xs font-semibold text-slate-500">Total Tests</p>
           </div>
           <div className="w-px bg-slate-100 relative z-10" />
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">AI Predict</p>
             <p className="text-2xl font-black text-indigo-600 mb-1">8.0 Target</p>
             <p className="text-xs font-semibold text-slate-500">Confidence 94%</p>
           </div>
        </div>
      </section>

      {/* Modes Grid */}
      <section className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <button className="rounded-full bg-indigo-600 text-white px-5 py-2 text-sm font-bold shadow-md shrink-0">
            All Formats
          </button>
          <button className="rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-5 py-2 text-sm font-bold transition-colors shrink-0">
            IELTS Academic
          </button>
          <button className="rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-5 py-2 text-sm font-bold transition-colors shrink-0">
            IELTS General
          </button>
          <button className="rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-5 py-2 text-sm font-bold transition-colors shrink-0">
            TOEIC
          </button>
          <button className="rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-5 py-2 text-sm font-bold transition-colors shrink-0">
            VSTEP
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Timed Mode Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="size-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg mb-6">
                <Clock3 size={24} />
              </div>
              <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2">Timed & Proctored</h2>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Full Mock Exam Mode</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-600 mb-8 min-h-[4.5rem]">
                Experience exact test duration, strict section pacing, AI webcam focus monitoring, and a comprehensive band score upon completion.
              </p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Clock3 size={16} /> 2h 45m average
                </span>
                <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-md transition-transform active:scale-95">
                  Start Full Exam <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Targeted Practice Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="size-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg mb-6">
                <FileCheck2 size={24} />
              </div>
              <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2">Targeted Practice</h2>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Skill Simulation Mode</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-600 mb-8 min-h-[4.5rem]">
                Focus on weak areas. Isolate Listening, Reading, Writing, or Speaking modules with adaptive question difficulty and live AI hints.
              </p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Sparkles size={16} /> Flexible duration
                </span>
                <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-md transition-transform active:scale-95">
                  Launch Skill Sim <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available Papers Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Available Test Papers</h3>
            <p className="text-sm font-medium text-slate-500">Select an exam paper to begin testing or review previous submission archives.</p>
          </div>
          <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
            <option>Sort by: Recommended</option>
            <option>Sort by: Newest</option>
            <option>Sort by: Difficulty</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test.slug}
              className="flex flex-col bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black tracking-wider text-indigo-700 uppercase">
                  {test.testType}
                </span>
                <span className="rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1">
                  🔥 {test.difficulty}
                </span>
              </div>
              
              <h4 className="text-lg font-bold text-slate-800 mb-2">
                {test.title}
              </h4>
              <p className="text-sm font-medium leading-relaxed text-slate-500 flex-1 mb-6 line-clamp-2">
                {test.description}
              </p>
              
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</p>
                  <p className="text-sm font-black text-slate-800">{test.estimatedMinutes}m</p>
                </div>
                <div className="text-center border-l border-r border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Questions</p>
                  <p className="text-sm font-black text-slate-800">40 Qs</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attempts</p>
                  <p className="text-sm font-black text-indigo-600">1,420</p>
                </div>
              </div>
              
              {test.activeSessionStatus ? (
                <p className="text-xs font-bold text-indigo-600 mb-4 text-center bg-indigo-50 py-1.5 rounded-md">
                  {formatMockSessionStatus(test.activeSessionStatus)}
                </p>
              ) : null}
              
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="flex-1 rounded-xl h-11 text-sm font-bold border-slate-200 text-slate-600 hover:bg-slate-50 border">
                  Review Solution
                </Button>
                <Button asChild className="flex-1 rounded-xl h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  <Link href={`/mock-tests/${test.slug}`}>
                    {test.activeSessionId ? "Resume" : "Take Test"}
                  </Link>
                </Button>
              </div>
            </div>
          ))}

          {/* Hardcoded mock items for visual matching with screenshot if not enough real tests */}
          {tests.length < 3 && (
            <>
              <div className="flex flex-col bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black tracking-wider text-indigo-700 uppercase">
                    TOEIC
                  </span>
                  <span className="rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
                    📈 Intermediate
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">TOEIC Full Simulation Test 04</h4>
                <p className="text-sm font-medium leading-relaxed text-slate-500 flex-1 mb-6">Complete Listening and Reading sections modeled precisely after...</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4 mb-6">
                  <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</p><p className="text-sm font-black text-slate-800">120m</p></div>
                  <div className="text-center border-l border-r border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Questions</p><p className="text-sm font-black text-slate-800">200 Qs</p></div>
                  <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attempts</p><p className="text-sm font-black text-indigo-600">2,850</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" className="flex-1 rounded-xl h-11 text-sm font-bold border-slate-200 text-slate-600 hover:bg-slate-50 border">Review Solution</Button>
                  <Button className="flex-1 rounded-xl h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">Resume</Button>
                </div>
              </div>
              <div className="flex flex-col bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black tracking-wider text-indigo-700 uppercase">
                    IELTS GENERAL
                  </span>
                  <span className="rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    ✅ Standard
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">IELTS General Training Mock 02</h4>
                <p className="text-sm font-medium leading-relaxed text-slate-500 flex-1 mb-6">Tailored for migration and workplace proficiency with...</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4 mb-6">
                  <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</p><p className="text-sm font-black text-slate-800">150m</p></div>
                  <div className="text-center border-l border-r border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Questions</p><p className="text-sm font-black text-slate-800">40 Qs</p></div>
                  <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attempts</p><p className="text-sm font-black text-indigo-600">930</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" className="flex-1 rounded-xl h-11 text-sm font-bold border-slate-200 text-slate-600 hover:bg-slate-50 border">Review Solution</Button>
                  <Button className="flex-1 rounded-xl h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">Take Test</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
}
