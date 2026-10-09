import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  HelpCircle,
  Languages,
} from "lucide-react";
import Link from "next/link";

import { startReadingPracticeAction } from "@/features/reading/actions";
import type { ReadingPracticePageData } from "@/features/reading/server/content";

export function ReadingStart({
  data,
  error,
}: {
  data: ReadingPracticePageData;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-10 font-sans">
      <header className="flex h-14 items-center px-3 mb-4">
        <Link
          href="/practice/reading"
          aria-label="Back to Reading"
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={18} />
          <span className="font-bold text-sm">Back to Library</span>
        </Link>
      </header>
      
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row">
        
        {/* Left Side: Image & Title */}
        <div className="md:w-1/2 p-8 md:p-12 bg-gradient-to-br from-emerald-50 to-white flex flex-col justify-center">
          <span className="inline-block self-start rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-700 uppercase mb-4">
            {data.exercise.difficulty} · Reading
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 text-pretty mb-4">
            {data.exercise.title}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-6">
            {data.exercise.summary}
          </p>
          
          <div className="flex flex-wrap gap-3 mb-6">
             <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md text-xs font-bold border border-indigo-100">#Environment</span>
             <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md text-xs font-bold border border-indigo-100">#Case Study</span>
          </div>
        </div>

        {/* Right Side: Action & Metadata */}
        <div className="md:w-1/2 p-8 md:p-12 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col">
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              [Clock3, `${Math.round(data.exercise.timeLimitSeconds / 60)} min`, "Time"],
              [HelpCircle, `${data.questions.length}`, "Questions"],
              [BookOpenText, `${data.passage.sections.length}`, "Sections"],
            ].map(([Icon, value, label]) => {
              const ItemIcon = Icon as typeof Clock3;
              return (
                <div key={String(label)} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <ItemIcon className="mx-auto text-emerald-600 mb-2" size={20} />
                  <p className="font-bold text-slate-800">{String(value)}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{String(label)}</p>
                </div>
              );
            })}
          </div>

          <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 mb-8">
            <h2 className="flex items-center gap-2 font-bold text-slate-800 mb-3 text-sm">
              <Languages size={18} className="text-amber-600" /> Key Vocabulary Preview
            </h2>
            <div className="flex flex-wrap gap-2">
              {["sustainable", "infrastructure", "mitigation", "temperature", "+4 more"].map(word => (
                <span key={word} className="rounded-lg border border-amber-200/60 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                  {word}
                </span>
              ))}
            </div>
          </section>

          <div className="mt-auto">
            {error ? (
              <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                Could not start this reading. Please try again.
              </p>
            ) : null}
            <form action={startReadingPracticeAction} className="w-full">
              <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
              <button type="submit" className="w-full flex items-center justify-center gap-2 min-h-14 rounded-2xl bg-emerald-600 text-lg font-black text-white hover:bg-emerald-700 hover:scale-[1.02] transition-all shadow-md">
                <BookOpenText size={20} /> Start Reading Focus
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
