"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { WritingSubmissionReviewData } from "@/features/writing/server/content";

const criterionLabels = {
  taskResponse: "Clarity",
  coherenceCohesion: "Structure",
  lexicalResource: "Vocabulary",
  grammaticalRangeAccuracy: "Grammar",
} as const;

type Correction = NonNullable<
  WritingSubmissionReviewData["feedback"]
>["correctedExamples"][number];

export function WritingFeedbackView({
  data,
}: {
  data: WritingSubmissionReviewData;
}) {
  const feedback = data.feedback;
  const [selectedCorrection, setSelectedCorrection] =
    useState<Correction | null>(null);
  const [comparisonTab, setComparisonTab] = useState<"original" | "improved">(
    "improved",
  );
  const improvedWriting = useMemo(
    () =>
      feedback
        ? feedback.correctedExamples.reduce(
            (text, correction) =>
              text.replace(correction.source, correction.revision),
            data.submission.text,
          )
        : data.submission.text,
    [data.submission.text, feedback],
  );

  if (!feedback) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pt-10 pb-24 font-sans px-4 sm:px-6">
      
      {/* Header */}
      <header className="flex h-14 items-center justify-between mb-8">
        <Link
          href="/practice/writing"
          aria-label="Back to Writing"
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={18} />
          <span className="font-bold text-sm">Back to Library</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/practice/writing/${data.task.slug}`}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
          >
            <PenLine size={16} /> Write Again
          </Link>
          <Link
            href={`/practice/writing/${data.task.slug}/submission/${data.submission.id}/complete`}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Finish Practice <ChevronRight size={16} />
          </Link>
        </div>
      </header>

      {/* Title Section */}
      <section className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-xs font-black uppercase text-indigo-700 tracking-widest mb-4">
          <Sparkles size={14} /> AI Feedback Report
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">{data.task.title}</h1>
        <p className="text-sm text-slate-500 font-medium">Analyzed based on official scoring rubrics.</p>
      </section>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Rubric & Feedback Summary */}
        <div className="lg:col-span-5 space-y-6">
          
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <Sparkles size={100} className="text-indigo-900" />
             </div>
             
             <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 relative z-10">
               Rubric Score
             </h2>
             
             <div className="space-y-5 relative z-10">
               {Object.entries(feedback.criteria).map(([key, criterion]) => (
                 <div key={key}>
                   <div className="flex items-end justify-between mb-1.5">
                     <p className="text-sm font-bold text-slate-700">
                       {criterionLabels[key as keyof typeof criterionLabels]}
                     </p>
                     <p className="text-xs font-black text-indigo-600">
                        {Math.round((criterion.band / 9) * 100)} / 100
                     </p>
                   </div>
                   <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                     <div
                       className="h-full rounded-full bg-indigo-500"
                       style={{ width: `${(criterion.band / 9) * 100}%` }}
                     />
                   </div>
                 </div>
               ))}
             </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="text-amber-500" /> Executive Summary
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 font-medium">
              {feedback.summary}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" /> Priority Improvements
            </h2>
            <ul className="space-y-4">
              {feedback.priorityIssues.slice(0, 3).map((item) => (
                <li key={`${item.issue}-${item.evidence}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-800 mb-1">{item.issue}</p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {item.evidence}
                  </p>
                </li>
              ))}
            </ul>
          </section>

        </div>

        {/* Right Column: Inline Corrections & Rewritten */}
        <div className="lg:col-span-7 space-y-6">
          
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="shrink-0 border-b border-slate-100 p-2 flex items-center bg-slate-50/50">
              <div className="flex bg-slate-200/50 p-1 rounded-xl w-full">
                <button
                  type="button"
                  onClick={() => setComparisonTab("original")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${comparisonTab === "original" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Inline Corrections
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonTab("improved")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${comparisonTab === "improved" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <span className="flex items-center justify-center gap-1.5"><Sparkles size={16}/> Advanced Rewrite</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white font-serif text-[17px] leading-loose text-slate-800">
              {comparisonTab === "original" ? (
                <>
                  <p className="text-xs font-sans font-bold text-slate-400 uppercase tracking-widest mb-6 text-center border-b border-slate-100 pb-4">
                    Click on highlighted texts to view AI explanations
                  </p>
                  
                  {/* Mock rendering of inline corrections - in a real app this would parse text and inject React nodes */}
                  <div className="whitespace-pre-wrap">
                    {data.submission.text}
                  </div>
                  
                  {feedback.correctedExamples.length > 0 && (
                     <div className="mt-8 pt-8 border-t border-slate-100 font-sans">
                       <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Found Issues</h3>
                       <div className="space-y-3">
                         {feedback.correctedExamples.map((example) => (
                           <button
                             type="button"
                             key={`${example.source}-${example.revision}`}
                             onClick={() => setSelectedCorrection(example)}
                             className="w-full text-left bg-rose-50/30 hover:bg-rose-50 border border-rose-100 rounded-xl p-4 transition-colors"
                           >
                             <div className="flex items-start gap-4">
                               <div className="flex-1">
                                 <p className="text-sm text-rose-700 line-through decoration-rose-300 font-medium mb-1">
                                   {example.source}
                                 </p>
                                 <p className="text-sm font-bold text-emerald-700">
                                   {example.revision}
                                 </p>
                               </div>
                               <ChevronRight size={18} className="text-slate-400 mt-2" />
                             </div>
                           </button>
                         ))}
                       </div>
                     </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-sans font-bold text-emerald-600 uppercase tracking-widest mb-6 text-center border-b border-emerald-50 pb-4 bg-emerald-50/50 -mt-4 p-4 rounded-xl">
                    Band 8.0+ Model Answer based on your ideas
                  </p>
                  <div className="whitespace-pre-wrap text-slate-800 selection:bg-emerald-200">
                    {improvedWriting}
                  </div>
                </>
              )}
            </div>
          </section>

        </div>

      </div>

      {selectedCorrection ? (
        <CorrectionDetail
          correction={selectedCorrection}
          taskSlug={data.task.slug}
          onClose={() => setSelectedCorrection(null)}
        />
      ) : null}
    </div>
  );
}

function CorrectionDetail({
  correction,
  taskSlug,
  onClose,
}: {
  correction: Correction;
  taskSlug: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17111f]/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close correction detail"
        className="absolute inset-0"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="correction-title"
        className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 id="correction-title" className="text-xl font-black text-slate-800">
            Correction Detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 mb-4">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
            Original Text
          </p>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-rose-800 line-through decoration-rose-300">
            {correction.source}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 mb-4 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={12}/> AI Suggestion
          </p>
          <p className="mt-2 text-[17px] leading-relaxed font-bold text-emerald-900">
            {correction.revision}
          </p>
        </div>

        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5"><Lightbulb size={12}/> AI Explanation</p>
          <p className="mt-2 text-sm leading-relaxed font-medium text-indigo-900">
            This revision corrects grammatical errors while maintaining your original meaning. The structure is now more natural and aligns with academic writing standards.
          </p>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors shadow-sm"
          >
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}

function ChangeSummary({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#e3ddec] bg-white p-3">
      <CheckCircle2
        aria-hidden="true"
        size={15}
        className="mt-0.5 shrink-0 text-[#4d32d4]"
      />
      <p className="text-xs leading-5 font-semibold">{label}</p>
    </div>
  );
}
