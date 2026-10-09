import { CheckCircle2, Clock3, RotateCcw, XCircle, ArrowRight, BarChart } from "lucide-react";
import Link from "next/link";

import { LessonMarkdown } from "@/features/learning/components/lesson-markdown";
import { calculateScorePercent } from "@/features/practice/model";
import type { getListeningPracticeResult } from "@/features/listening/server/content";

type ResultData = NonNullable<
  Awaited<ReturnType<typeof getListeningPracticeResult>>
>;

export function ListeningResult({ data }: { data: ResultData }) {
  const { result, exercise, options } = data;
  const optionById = new Map(
    options.map((option) => [option.id, option.label]),
  );
  const percent = calculateScorePercent(result.score, result.maxScore);
  const elapsedSeconds = Math.max(
    0,
    Math.round(
      (Date.parse(result.submittedAt) - Date.parse(result.startedAt)) / 1000,
    ),
  );
  
  const isPerfect = percent === 100;
  const isGood = percent >= 70;

  return (
    <div className="mx-auto min-h-[100dvh] bg-zinc-50 font-sans pb-24 selection:bg-indigo-500/30">
      
      {/* Header Result summary */}
      <div className="bg-zinc-950 text-white px-4 py-16 md:py-20 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
           <div className={`absolute -top-1/2 -right-1/4 h-[600px] w-[600px] rounded-full blur-[100px] ${isPerfect ? 'bg-emerald-500' : isGood ? 'bg-indigo-500' : 'bg-rose-500'}`} />
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 mb-6 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400"></span>
              <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">Practice Result</span>
            </div>
            <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight text-white mb-6">
              {exercise.title}
            </h1>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
              <Clock3 size={16} className="text-indigo-400" />
              Time elapsed: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
              <span className="opacity-50 mx-2">|</span>
              {result.submittedAfterTimeLimit ? <span className="text-rose-400">Late submission</span> : <span className="text-emerald-400">Within time limit</span>}
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md min-w-[200px] text-center">
             <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Final Score</p>
             <div className="flex items-baseline justify-center gap-2 mb-1">
               <span className={`text-6xl font-semibold tracking-tighter ${isPerfect ? 'text-emerald-400' : isGood ? 'text-indigo-400' : 'text-rose-400'}`}>{result.score}</span>
               <span className="text-2xl font-medium text-zinc-500">/ {result.maxScore}</span>
             </div>
             <p className="text-lg font-semibold text-zinc-300">{percent}% Accuracy</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-12">
        <section aria-labelledby="listening-review-title">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-xl">
              <BarChart size={20} />
            </div>
            <h2 id="listening-review-title" className="text-2xl font-semibold tracking-tight text-zinc-900">
              Detailed Review
            </h2>
          </div>
          
          <ol className="space-y-6">
            {result.questions.map((question) => {
              const selected = question.selectedOptionIds
                .map((id) => optionById.get(id))
                .filter((label): label is string => Boolean(label));
              const correct = (question.correctOptionIds ?? [])
                .map((id) => optionById.get(id))
                .filter((label): label is string => Boolean(label));
              return (
                <li
                  key={question.questionId}
                  className={`relative overflow-hidden rounded-[2rem] border bg-white p-6 sm:p-8 transition-shadow hover:shadow-lg ${question.isCorrect ? "border-emerald-200/50 shadow-emerald-500/5" : "border-rose-200/50 shadow-rose-500/5"}`}
                >
                  <div className={`absolute top-0 left-0 w-2 h-full ${question.isCorrect ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  
                  <div className="flex items-start justify-between mb-6 pl-4">
                     <span className="inline-block px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-widest rounded-lg">
                       Question {question.position}
                     </span>
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest ${question.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {question.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {question.awardedPoints} / {question.points} pts
                     </span>
                  </div>

                  <div className="pl-4">
                    <div className="text-lg font-medium text-zinc-900 leading-relaxed mb-8 max-w-[65ch]">
                      <LessonMarkdown>{question.promptMarkdown}</LessonMarkdown>
                    </div>
                    
                    <dl className="grid sm:grid-cols-2 gap-8 text-sm">
                      <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                        <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Your Answer</dt>
                        <dd className={`font-medium leading-relaxed ${question.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {question.answerText ||
                            selected.join("; ") ||
                            <span className="text-zinc-400 italic">No answer provided</span>}
                        </dd>
                      </div>
                      
                      {result.reviewAllowed ? (
                        <>
                          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
                            <dt className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Correct Answer</dt>
                            <dd className="font-semibold text-indigo-950 leading-relaxed">
                              {(question.acceptedTextAnswers ?? []).join(
                                "; ",
                              ) || correct.join("; ")}
                            </dd>
                          </div>
                          
                          {question.explanationMarkdown ? (
                            <div className="sm:col-span-2 bg-zinc-50 p-5 rounded-2xl border border-zinc-100 mt-2">
                              <dt className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Explanation</dt>
                              <dd className="text-zinc-600 leading-relaxed font-medium">
                                <LessonMarkdown>
                                  {question.explanationMarkdown}
                                </LessonMarkdown>
                              </dd>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {result.reviewAllowed ? (
          <section
            aria-labelledby="listening-transcript-title"
            className="rounded-[2rem] border border-zinc-200/80 bg-white p-8 sm:p-10 shadow-sm"
          >
            <h2 id="listening-transcript-title" className="text-2xl font-semibold tracking-tight text-zinc-900 mb-6">
              Full Transcript
            </h2>
            <div className="prose prose-zinc max-w-none prose-p:leading-relaxed prose-p:text-zinc-600">
              <LessonMarkdown>{result.transcriptMarkdown}</LessonMarkdown>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-zinc-200">
          <Link href={`/practice/listening/${exercise.slug}`} className="w-full sm:w-auto group flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white text-zinc-900 font-semibold border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all shadow-sm">
            <RotateCcw size={18} className="text-zinc-400 group-hover:-rotate-180 transition-transform duration-500" />
            Try Again
          </Link>
          <Link href="/practice/listening" className="w-full sm:w-auto group flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10">
            Back to Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
