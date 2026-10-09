"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  FileCheck2,
  Headphones,
  Mic,
  PenLine,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { startMockTestAction } from "@/features/mock-tests/actions";
import {
  formatMockDuration,
  formatMockSectionType,
} from "@/features/mock-tests/model";
import type { MockTestDetailData } from "@/features/mock-tests/server/content";

const sectionIcons: Record<string, React.ElementType> = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

const sectionColors: Record<string, string> = {
  listening: "bg-blue-50 border-blue-100 text-blue-600",
  reading: "bg-emerald-50 border-emerald-100 text-emerald-600",
  writing: "bg-amber-50 border-amber-100 text-amber-600",
  speaking: "bg-rose-50 border-rose-100 text-rose-600",
};

export function MockTestDetail({
  data,
  error,
}: {
  data: MockTestDetailData;
  error?: string;
}) {
  const totalMinutes = data.sections.reduce(
    (acc, s) => acc + Math.ceil(s.timeLimitSeconds / 60),
    0,
  );

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Back link */}
      <Link
        href="/mock-tests"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
      >
        <ArrowLeft size={16} /> Back to Exam Arena
      </Link>

      {/* Hero Header */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-60 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black tracking-wider text-indigo-700 uppercase border border-indigo-100">
              {data.version.test_type}
            </span>
            <span className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-black tracking-wider text-orange-700 uppercase border border-orange-100 flex items-center gap-1.5">
              <Zap size={12} /> {data.version.difficulty}
            </span>
          </div>

          <h1 className="text-3xl font-black text-slate-800 sm:text-4xl mb-3 max-w-2xl">
            {data.version.title}
          </h1>
          <p className="text-base font-medium leading-relaxed text-slate-500 max-w-2xl mb-8">
            {data.version.description}
          </p>

          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
              <div className="size-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Clock3 size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Time</p>
                <p className="text-base font-black text-slate-800">{totalMinutes} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
              <div className="size-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileCheck2 size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sections</p>
                <p className="text-base font-black text-slate-800">{data.sections.length} Parts</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
              <div className="size-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Shield size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mode</p>
                <p className="text-base font-black text-slate-800">Proctored</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
              <div className="size-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <Target size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">AI Scoring</p>
                <p className="text-base font-black text-slate-800">Instant Band</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exam Structure */}
      <section>
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <span className="size-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black flex items-center justify-center">{data.sections.length}</span>
          Exam Structure
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {data.sections.map((section) => {
            const sectionKey = section.type.toLowerCase();
            const Icon = sectionIcons[sectionKey] ?? FileCheck2;
            const colorClass = sectionColors[sectionKey] ?? "bg-slate-50 border-slate-100 text-slate-600";
            return (
              <li
                key={section.id}
                className="flex gap-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`size-12 rounded-2xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">
                    Section {section.order}
                  </p>
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    {formatMockSectionType(section.type)}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-500 mb-3 line-clamp-2">
                    {section.title}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                    <Clock3 size={13} />
                    {formatMockDuration(section.timeLimitSeconds)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Error alert */}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 border border-rose-100 px-5 py-4 font-semibold text-rose-700 text-sm"
        >
          ⚠️ Chưa thể bắt đầu mock test. Vui lòng thử lại.
        </p>
      ) : null}

      {/* CTA Block */}
      <div className="bg-indigo-600 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg shadow-indigo-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-white/5 rounded-full translate-y-1/3 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-black text-white mb-2">
            {data.activeSessionId ? "Continue Your Session" : "Ready to Begin?"}
          </h2>
          <p className="text-sm font-medium leading-relaxed text-indigo-200 max-w-sm">
            {data.activeSessionId
              ? "Your previous progress has been saved. Pick up right where you left off."
              : "Each section opens in sequence. Strict time limits apply. Your AI band score will be ready upon completion."}
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          {data.activeSessionId ? (
            <Button
              asChild
              className="h-14 px-8 text-base font-black rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 shadow-md transition-transform active:scale-95"
            >
              <Link href={`/mock-tests/${data.test.slug}/session/${data.activeSessionId}`}>
                Continue Session <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
          ) : (
            <form action={startMockTestAction}>
              <input type="hidden" name="mockTestSlug" value={data.test.slug} />
              <Button
                type="submit"
                className="h-14 px-8 text-base font-black rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 shadow-md transition-transform active:scale-95"
              >
                Start Full Exam <ArrowRight size={18} className="ml-2" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
