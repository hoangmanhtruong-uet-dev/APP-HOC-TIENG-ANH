"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import {
  diffSentenceText,
  formatSecondsToMMSS,
  getNextWordHint,
  type DictationExercise,
  type DictationSentence,
  type SentenceDiffResult,
} from "../model";

export function DictationRunner({ exercise }: { exercise: DictationExercise }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [autoPause, setAutoPause] = useState(true);

  // User input per sentence
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Saved sentence diff results after clicking "Check"
  const [diffResults, setDiffResults] = useState<Record<string, SentenceDiffResult>>({});
  // Active sentence hint message
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const currentSentence: DictationSentence = exercise.sentences[currentIndex];
  const userText = answers[currentSentence.id] || "";
  const currentDiff = diffResults[currentSentence.id];

  // Play audio segment for active sentence
  const playSentenceAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentSentence.startTime;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        // Fallback to Web Speech API synthesis if audio file playback fails
        speakWebSpeech(currentSentence.text, playbackSpeed);
      });
    } else {
      speakWebSpeech(currentSentence.text, playbackSpeed);
    }
  };

  const speakWebSpeech = (text: string, rate: number) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      playSentenceAudio();
    }
  };

  // Monitor audio time update for auto pause at end of sentence segment
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (autoPause && audio.currentTime >= currentSentence.endTime) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentIndex, currentSentence.endTime, autoPause]);

  // Update playback speed when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleInputChange = (text: string) => {
    setAnswers((prev) => ({ ...prev, [currentSentence.id]: text }));
    // Clear hint when typing
    setActiveHint(null);
  };

  const checkCurrentSentence = () => {
    const result = diffSentenceText(currentSentence.text, userText);
    setDiffResults((prev) => ({ ...prev, [currentSentence.id]: result }));
  };

  const showHint = () => {
    const hint = getNextWordHint(currentSentence.text, userText);
    setActiveHint(hint);
  };

  const handleNext = () => {
    if (currentIndex < exercise.sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setActiveHint(null);
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setActiveHint(null);
      setIsPlaying(false);
    }
  };

  const submitDictation = () => {
    // Save all sentence diffs
    const allDiffs: Record<string, SentenceDiffResult> = {};
    exercise.sentences.forEach((sent) => {
      const text = answers[sent.id] || "";
      allDiffs[sent.id] = diffSentenceText(sent.text, text);
    });

    // Store in sessionStorage for result page
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `dictation_result_${exercise.slug}`,
        JSON.stringify({ exercise, answers, diffs: allDiffs, completedAt: new Date().toISOString() })
      );
    }

    router.push(`/practice/listening/dictation/${exercise.slug}/result`);
  };

  const completedSentencesCount = Object.keys(diffResults).length;

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pb-24">
      {/* Hidden Audio element */}
      <audio ref={audioRef} src={exercise.audioUrl} preload="metadata" muted={isMuted} />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/practice/listening/dictation")}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            title="Trở về danh sách Dictation"
          >
            <X size={20} />
          </button>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider">
              {exercise.category} · Dictation
            </span>
            <h1 className="font-bold text-slate-800 text-sm sm:text-base truncate max-w-xs sm:max-w-md">
              {exercise.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tiến độ câu</p>
            <p className="text-xs font-bold text-amber-600">
              {currentIndex + 1} / {exercise.sentences.length} câu
            </p>
          </div>
          <button
            onClick={submitDictation}
            className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Check size={16} /> Nộp bài
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Stepper */}
        <div className="flex items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {exercise.sentences.map((sent, index) => {
            const isDone = Boolean(diffResults[sent.id]);
            const isCurrent = index === currentIndex;
            return (
              <button
                key={sent.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setActiveHint(null);
                }}
                className={`flex-1 min-w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-amber-500 text-white ring-4 ring-amber-100 shadow-md scale-105"
                    : isDone
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {isDone ? <Check size={16} /> : index + 1}
              </button>
            );
          })}
        </div>

        {/* Sentence Audio Control Box */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={16} /> Câu {currentSentence.position} / {exercise.sentences.length}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {formatSecondsToMMSS(currentSentence.startTime)} - {formatSecondsToMMSS(currentSentence.endTime)}
            </span>
          </div>

          {/* Main Playback Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              >
                {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
              </button>
              <div>
                <p className="text-sm font-bold text-white">Phát âm thanh câu {currentIndex + 1}</p>
                <p className="text-xs text-slate-400">Ấn phím Space để Phát / Tạm dừng</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={playSentenceAudio}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Nghe lại từ đầu câu"
              >
                <RotateCcw size={14} /> Replay câu
              </button>

              {/* Speed toggle */}
              <div className="flex bg-white/10 rounded-xl p-1 border border-white/10">
                {[0.75, 1.0, 1.25].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      playbackSpeed === speed
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dictation Typing Workspace */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <label htmlFor="dictation-input" className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Gõ lại những gì bạn nghe được:</span>
            </label>
            <span className="text-xs font-medium text-slate-400">
              {userText.trim().split(/\s+/).filter(Boolean).length} từ
            </span>
          </div>

          <textarea
            id="dictation-input"
            rows={3}
            value={userText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Gõ chính xác tiếng Anh nghe được tại đây..."
            className="w-full p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base font-medium text-slate-800 placeholder:text-slate-400 resize-none outline-none transition-all"
          />

          {/* Hint alert */}
          {activeHint && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Lightbulb size={18} className="text-amber-600 shrink-0" />
              <span>{activeHint}</span>
            </div>
          )}

          {/* Diff Result Feedback Card */}
          {currentDiff && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Kết quả kiểm tra câu {currentIndex + 1}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    currentDiff.accuracyPercent >= 90
                      ? "bg-emerald-100 text-emerald-700"
                      : currentDiff.accuracyPercent >= 60
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {currentDiff.accuracyPercent}% Chính xác
                </span>
              </div>

              {/* Word-by-word diff display */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap gap-1.5 leading-relaxed text-sm">
                {currentDiff.diffItems.map((item, i) => {
                  if (item.status === "correct") {
                    return (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {item.word}
                      </span>
                    );
                  }
                  if (item.status === "missing") {
                    return (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold line-through">
                        {item.word}
                      </span>
                    );
                  }
                  if (item.status === "typo" || item.status === "extra") {
                    return (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        {item.userWord ? `${item.userWord} → (${item.word})` : item.word}
                      </span>
                    );
                  }
                  return <span key={i}>{item.word}</span>;
                })}
              </div>

              {/* Sentence Translation & Notes */}
              {currentSentence.translation && (
                <p className="text-xs text-slate-500 font-medium italic">
                  Dịch nghĩa: &quot;{currentSentence.translation}&quot;
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={showHint}
                className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5"
              >
                <Lightbulb size={15} /> Gợi ý từ tiếp theo
              </button>
              <button
                onClick={checkCurrentSentence}
                disabled={!userText.trim()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 size={16} /> Kiểm tra câu này
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Câu trước
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === exercise.sentences.length - 1}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
              >
                Câu sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
