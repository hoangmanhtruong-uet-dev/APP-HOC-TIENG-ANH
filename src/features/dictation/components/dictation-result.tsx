"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Volume2,
  BookOpen,
} from "lucide-react";
import type { DictationExercise, SentenceDiffResult } from "../model";

export function DictationResult({ exercise }: { exercise: DictationExercise }) {
  const router = useRouter();
  const [resultData, setResultData] = useState<{
    answers: Record<string, string>;
    diffs: Record<string, SentenceDiffResult>;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(`dictation_result_${exercise.slug}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          
          setResultData(parsed);
        } catch {
          // ignore error
        }
      }
    }
  }, [exercise.slug]);

  const diffsList = resultData ? Object.values(resultData.diffs) : [];
  const totalSentences = exercise.sentences.length;
  const averageAccuracy =
    diffsList.length > 0
      ? Math.round(diffsList.reduce((acc, item) => acc + item.accuracyPercent, 0) / diffsList.length)
      : 0;

  const totalWords = diffsList.reduce((acc, item) => acc + item.wordCount, 0);
  const totalCorrect = diffsList.reduce((acc, item) => acc + item.correctCount, 0);

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pb-24 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Victory Hero Card */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-indigo-800 p-8 sm:p-10 text-white shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <Trophy size={48} className="text-amber-300 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black">Hoàn Thành Dictation!</h1>
            <p className="text-amber-100 text-sm max-w-lg mx-auto">
              Bạn đã hoàn thành bài chép chính tả &quot;{exercise.title}&quot;.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4">
              <span className="block text-3xl font-black text-amber-300">{averageAccuracy}%</span>
              <span className="text-[11px] font-bold text-amber-100 uppercase">Độ chính xác</span>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4">
              <span className="block text-3xl font-black text-white">{totalCorrect}/{totalWords}</span>
              <span className="text-[11px] font-bold text-amber-100 uppercase">Từ gõ đúng</span>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4">
              <span className="block text-3xl font-black text-emerald-300">{totalSentences}</span>
              <span className="text-[11px] font-bold text-amber-100 uppercase">Tổng số câu</span>
            </div>
          </div>
        </section>

        {/* Detailed Breakdown per Sentence */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" /> Chi Tiết Từng Câu
            </h2>
            <span className="text-xs font-semibold text-slate-400">Audio playback available</span>
          </div>

          <div className="space-y-4">
            {exercise.sentences.map((sent, index) => {
              const diff = resultData?.diffs[sent.id];
              const userTyped = resultData?.answers[sent.id] || "";
              const accuracy = diff ? diff.accuracyPercent : 0;

              return (
                <div key={sent.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">Câu {sent.position}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => speakText(sent.text)}
                        className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1"
                      >
                        <Volume2 size={14} /> Nghe lại
                      </button>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          accuracy >= 90
                            ? "bg-emerald-100 text-emerald-700"
                            : accuracy >= 60
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {accuracy}%
                      </span>
                    </div>
                  </div>

                  {/* Target vs Typed */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Văn bản gốc:</span>
                      <p className="font-bold text-slate-800 text-sm">{sent.text}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Bạn đã gõ:</span>
                      <p className="font-semibold text-slate-600">{userTyped || "(Chưa nhập văn bản)"}</p>
                    </div>
                    {sent.translation && (
                      <p className="text-slate-400 italic">Dịch: &quot;{sent.translation}&quot;</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href={`/practice/listening/dictation/${exercise.slug}`}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Luyện lại bài này
          </Link>
          <Link
            href="/practice/listening/dictation"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <BookOpen size={16} /> Danh sách bài Dictation
          </Link>
        </div>
      </div>
    </div>
  );
}
