import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  Headphones,
  MessageCircleQuestion,
  RotateCcw,
  AudioLines
} from "lucide-react";
import Link from "next/link";

import { startListeningPracticeAction } from "@/features/listening/actions";
import type { ListeningPracticePageData } from "@/features/listening/server/content";

export function ListeningStart({
  data,
  error,
}: {
  data: ListeningPracticePageData;
  error?: string;
}) {
  const steps = [
    [BookOpenText, "Key Vocabulary", "Review essential words before starting."],
    [Headphones, "Focus & Listen", "Full audio playback with precise controls."],
    [
      MessageCircleQuestion,
      "Test Comprehension",
      `Answer ${data.questions.length} questions based on the dialogue.`,
    ],
    [
      RotateCcw,
      "Review & Retain",
      "Follow the transcript to catch what you missed.",
    ],
  ] as const;
  return (
    <div className="mx-auto max-w-5xl space-y-8 pt-8 md:pt-12 font-sans selection:bg-indigo-500/30">
      <header className="flex items-center px-4 md:px-0">
        <Link
          href="/practice/listening"
          aria-label="Back to Listening"
          className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 group-hover:bg-zinc-200 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="font-semibold text-sm tracking-wide">Dashboard</span>
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/50 flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side: Image & Title */}
        <div className="md:w-5/12 p-10 md:p-12 lg:p-16 bg-zinc-950 flex flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute -top-1/2 -left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500 blur-[100px]" />
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-white/5 px-3 py-1 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
                {data.exercise.difficulty}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1] mb-6">
              {data.exercise.title}
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-[30ch]">
              {data.exercise.summary}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-6 text-sm font-medium text-zinc-300 mt-12">
            <span className="flex items-center gap-2">
              <Clock3 size={18} className="text-indigo-400" />
              {Math.round(data.exercise.timeLimitSeconds / 60)} min
            </span>
            <span className="flex items-center gap-2">
              <AudioLines size={18} className="text-indigo-400" />
              {data.questions.length} Questions
            </span>
          </div>
        </div>

        {/* Right Side: Action & Steps */}
        <div className="md:w-7/12 p-10 md:p-12 lg:p-16 flex flex-col justify-center bg-zinc-50/50">
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-zinc-900">Lesson Roadmap</h2>
          <ol className="grid gap-4 sm:grid-cols-2 mb-10">
            {steps.map(([Icon, title, description], index) => (
              <li
                key={title}
                className="flex flex-col gap-3 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-zinc-900 mb-1">{title}</p>
                  <p className="text-xs font-medium text-zinc-500 leading-relaxed">{description}</p>
                </div>
              </li>
            ))}
          </ol>

          {error ? (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              <div className="mt-0.5"><MessageCircleQuestion size={16} /></div>
              <p>Could not start this lesson. Please try again or check your connection.</p>
            </div>
          ) : null}

          <form action={startListeningPracticeAction} className="w-full mt-auto">
            <input type="hidden" name="exerciseSlug" value={data.exercise.slug} />
            <button type="submit" className="group w-full flex items-center justify-center gap-3 min-h-[64px] rounded-2xl bg-zinc-900 text-lg font-semibold tracking-wide text-white hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-xl shadow-zinc-900/10">
              <Headphones size={22} className="group-hover:scale-110 transition-transform" /> 
              Enter Practice Room
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
