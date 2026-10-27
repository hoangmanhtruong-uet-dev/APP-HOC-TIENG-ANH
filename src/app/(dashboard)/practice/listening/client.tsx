"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Headphones,
  Mic,
  Play,
  Pause,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Clock,
  BookOpen,
  Sliders,
  ChevronDown,
  Layers,
  Activity,
  Target,
  ShieldAlert,
  Search,
  X,
  Compass,
  Bookmark,
  Award,
  Check,
  Radio
} from "lucide-react";

import type { ListeningCatalogItem } from "@/features/listening/server/content";
import {
  CURATED_EXERCISES,
  BAND_STAGES,
  TOPIC_TRACKS,
  type CuratedExercise,
  type BandStage
} from "./components/listening-curated-data";

export { BAND_STAGES };
import { LiveMiniLab } from "./components/LiveMiniLab";
import { FloatingAudioDock, type FloatingAudioTrack } from "./components/FloatingAudioDock";
import { QuickPracticeModal } from "./components/QuickPracticeModal";
import type { VisualMode, AmbientNoise } from "./components/ThreeSonicVisualizer";
import "./listening.css";

// Dynamic import for Three.js 3D canvas (prevents SSR hydration error)
const ThreeSonicVisualizer = dynamic(
  () => import("./components/ThreeSonicVisualizer").then((mod) => mod.ThreeSonicVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[260px] flex items-center justify-center text-xs text-indigo-300 font-mono">
        <Activity className="w-5 h-5 animate-spin mr-2" />
        Đang nạp 3D Sonic Engine...
      </div>
    )
  }
);

export interface ListeningHubProps {
  items: ListeningCatalogItem[];
  accuracy: number;
  attemptsCount: number;
  profile: {
    current_band: number | null;
    target_band: number | null;
    daily_study_minutes: number | null;
    target_exam_date: string | null;
  } | null;
}

export function ListeningHubClient({
  items,
  accuracy,
  attemptsCount,
  profile
}: ListeningHubProps) {
  // 1. Initial Band Stage
  const userTargetBand = profile?.target_band ?? 6.5;
  const initialStage = useMemo(() => {
    return (
      BAND_STAGES.find((s) => {
        if (s.maxBand === 9.0) {
          return userTargetBand >= s.minBand && userTargetBand <= 9.0;
        }
        return userTargetBand >= s.minBand && userTargetBand < s.maxBand;
      }) ?? BAND_STAGES[5] // Default Upper-Intermediate (6.5 - 7.5)
    );
  }, [userTargetBand]);

  const [selectedStage, setSelectedStage] = useState<BandStage>(initialStage);
  const [showBandDropdown, setShowBandDropdown] = useState(false);

  // 2. Audio & Visualizer States
  const [currentTrack, setCurrentTrack] = useState<FloatingAudioTrack>({
    id: CURATED_EXERCISES[0].id,
    title: CURATED_EXERCISES[0].title,
    subtitle: CURATED_EXERCISES[0].subtitle,
    accent: CURATED_EXERCISES[0].accent,
    bandRange: CURATED_EXERCISES[0].band,
    durationSec: CURATED_EXERCISES[0].durationSec,
    audioUrl: CURATED_EXERCISES[0].audioUrl
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [ambientNoise, setAmbientNoise] = useState<AmbientNoise>("off");
  const [visualMode, setVisualMode] = useState<VisualMode>("sphere");
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [abLoop, setAbLoop] = useState(false);

  // 3. Bento Grid State
  const [bentoSpeedPreview, setBentoSpeedPreview] = useState(1.25);
  const [bentoAccentPreview, setBentoAccentPreview] = useState("UK");

  // 4. Exercise Library & Filtering States
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyUncompleted, setOnlyUncompleted] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(["ex-1", "ex-4"]);
  const [vocabPopoverId, setVocabPopoverId] = useState<string | null>(null);

  // 5. Quick Practice Modal State
  const [activePracticeExercise, setActivePracticeExercise] = useState<CuratedExercise | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Web Speech API fallback synthesizer
  const speakText = useCallback((text: string, lang = "en-GB", rate = 1.0) => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignored if blocked by autoplay restrictions
    }
  }, []);

  // Merge Curated Exercises with real Supabase database items
  const allExercises = useMemo<CuratedExercise[]>(() => {
    const curated = [...CURATED_EXERCISES];

    if (items && items.length > 0) {
      items.forEach((item, idx) => {
        const exists = curated.some((c) => c.slug === item.slug);
        if (!exists) {
          curated.push({
            id: `db-${item.slug || idx}`,
            slug: item.slug,
            title: item.title,
            subtitle: item.summary,
            badge: "OFFICIAL",
            badgeColor: "from-indigo-500/20 to-blue-500/20 text-indigo-300 border-indigo-500/30",
            accent: "UK Accent",
            accentFlag: "🇬🇧",
            band: item.difficulty || "6.0 - 7.5",
            bandGroup: "Band 6.5 - 7.5",
            duration: `${Math.floor((item.durationSeconds || 180) / 60)}m ${(item.durationSeconds || 180) % 60}s`,
            durationSec: item.durationSeconds || 180,
            questionsCount: item.questionCount || 10,
            category: item.testType || "IELTS Practice",
            section: "Section 2",
            isSpeedRun: false,
            completed: false,
            paraphraseTraps: 6,
            sampleSentence: item.summary,
            transcript: [
              { time: 0, text: item.title },
              { time: 10, text: item.summary }
            ],
            vocab: [
              { word: "Comprehensive", meaning: "Toàn diện, bao quát", ipa: "/ˌkɒm.prɪˈhen.sɪv/" }
            ],
            questions: [
              { id: 1, q: `${item.title}: Check comprehension.`, answer: "yes", hint: "Nghe kỹ bối cảnh mở đầu" }
            ]
          });
        }
      });
    }

    return curated;
  }, [items]);

  // Filtered Exercises
  const filteredExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      if (onlyUncompleted && ex.completed) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = ex.title.toLowerCase().includes(q);
        const matchSub = ex.subtitle.toLowerCase().includes(q);
        const matchCat = ex.category.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchCat) return false;
      }

      if (activeFilter === "ALL") return true;
      if (activeFilter === "UK") return ex.accent.toLowerCase().includes("uk");
      if (activeFilter === "US") return ex.accent.toLowerCase().includes("us");
      if (activeFilter === "AUS") return ex.accent.toLowerCase().includes("aus");
      if (activeFilter === "SPEED") return ex.isSpeedRun;
      if (activeFilter === "BAND_LOW") return ex.bandGroup === "Band 4.5 - 6.5";
      if (activeFilter === "BAND_MID") return ex.bandGroup === "Band 6.5 - 7.5";
      if (activeFilter === "BAND_HIGH") return ex.bandGroup === "Band 7.5 - 9.0";
      return true;
    });
  }, [allExercises, activeFilter, searchQuery, onlyUncompleted]);

  // Audio Sync & Playback Timer
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= currentTrack.durationSec) {
          if (abLoop) return 0;
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, currentTrack.durationSec, playbackSpeed, abLoop]);

  // Audio element sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackSpeed;
    audioRef.current.muted = isMuted;
  }, [playbackSpeed, isMuted]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack.audioUrl) return;

    if (isPlaying) {
      try {
        const p = audioRef.current.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Fallback to speech synthesis if autoplay is blocked
          });
        }
      } catch {}
    } else {
      try {
        audioRef.current.pause();
      } catch {}
    }
  }, [isPlaying, currentTrack]);

  // Find active transcript line
  const activeExerciseObj = allExercises.find((e) => e.id === currentTrack.id) || allExercises[0];
  const currentTranscriptLine = useMemo(() => {
    if (!activeExerciseObj?.transcript || activeExerciseObj.transcript.length === 0) {
      return activeExerciseObj?.sampleSentence || "";
    }
    const lines = activeExerciseObj.transcript;
    let activeLine = lines[0]?.text || "";
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        activeLine = lines[i].text;
      }
    }
    return activeLine;
  }, [activeExerciseObj, currentTime]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      if (!currentTrack.audioUrl && activeExerciseObj) {
        const lang = activeExerciseObj.accent.includes("US")
          ? "en-US"
          : activeExerciseObj.accent.includes("AUS")
          ? "en-AU"
          : "en-GB";
        speakText(activeExerciseObj.sampleSentence, lang, playbackSpeed);
      }
      showToast("Đang phát âm thanh");
    } else {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      showToast("Đã tạm dừng");
    }
  };

  // Preview an exercise
  const handlePreviewExercise = (exercise: CuratedExercise) => {
    if (currentTrack.id === exercise.id && isPlaying) {
      setIsPlaying(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      showToast("Đã dừng phát");
    } else {
      setCurrentTrack({
        id: exercise.id,
        title: exercise.title,
        subtitle: exercise.subtitle,
        accent: exercise.accent,
        bandRange: exercise.band,
        durationSec: exercise.durationSec,
        audioUrl: exercise.audioUrl
      });
      setCurrentTime(0);
      setIsPlaying(true);
      setIsDockMinimized(false);

      if (!exercise.audioUrl) {
        const lang = exercise.accent.includes("US")
          ? "en-US"
          : exercise.accent.includes("AUS")
          ? "en-AU"
          : "en-GB";
        speakText(exercise.sampleSentence, lang, playbackSpeed);
      }
      showToast(`Đang nghe thử: ${exercise.title}`);
    }
  };

  // Open Quick Practice Modal
  const handleOpenPracticeModal = (exercise: CuratedExercise) => {
    setActivePracticeExercise(exercise);
    setCurrentTrack({
      id: exercise.id,
      title: exercise.title,
      subtitle: exercise.subtitle,
      accent: exercise.accent,
      bandRange: exercise.band,
      durationSec: exercise.durationSec,
      audioUrl: exercise.audioUrl
    });
    setCurrentTime(0);
    setIsPlaying(true);

    if (!exercise.audioUrl) {
      const lang = exercise.accent.includes("US")
        ? "en-US"
        : exercise.accent.includes("AUS")
        ? "en-AU"
        : "en-GB";
      speakText(exercise.sampleSentence, lang, playbackSpeed);
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    showToast(bookmarkedIds.includes(id) ? "Đã gỡ bài tập" : "Đã lưu bài vào yêu thích");
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const next = speeds[nextIdx];
    setPlaybackSpeed(next);
    showToast(`Tốc độ nghe: ${next}x`);
  };

  return (
    <div className="listening-theme-root pb-32 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Hidden real audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        preload="metadata"
        onEnded={() => {
          if (!abLoop) setIsPlaying(false);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fadeIn bg-indigo-600/90 text-white px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-xs font-bold border border-indigo-400/40 flex items-center gap-2">
          <Sparkles size={14} className="text-[#F6E85C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-violet-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] bg-cyan-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-10 relative z-10">
        {/* =========================================================
            1. HERO SECTION WITH THREE.JS 3D SONIC VISUALIZER
        ========================================================= */}
        <section className="relative rounded-3xl overflow-hidden border border-[#2B3060] bg-gradient-to-br from-[#141731] via-[#0E1128] to-[#17143C] shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10 items-center relative">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-6 relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
                  LISTENING TRAINING CENTER
                </div>

                {/* Band Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBandDropdown(!showBandDropdown)}
                    className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {selectedStage.name} (Band {selectedStage.bandRange})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showBandDropdown && (
                    <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#141731] border border-[#2B3060] shadow-2xl p-2 z-50 backdrop-blur-xl">
                      {BAND_STAGES.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedStage(b);
                            setShowBandDropdown(false);
                            showToast(`Đã chọn mục tiêu: ${b.name} (${b.bandRange})`);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                            selectedStage.id === b.id
                              ? "bg-indigo-600 text-white"
                              : "text-zinc-300 hover:bg-[#1B1F40]"
                          }`}
                        >
                          <div>
                            <div className="font-bold">{b.name} ({b.bandRange})</div>
                            <div className="text-[10px] text-zinc-400 font-normal">{b.vietnameseTitle}</div>
                          </div>
                          {selectedStage.id === b.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
                  Luyện Nghe IELTS Thực Chiến{" "}
                  <span className="block mt-1 bg-gradient-to-r from-indigo-400 via-violet-300 to-[#F6E85C] bg-clip-text text-transparent">
                    Chuẩn Format & Phản Xạ Nhanh.
                  </span>
                </h1>
                <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                  Luyện tập với âm thanh người bản ngữ đa quốc gia (
                  <span className="text-indigo-300 font-medium">UK, US, AUS</span>), nhận diện{" "}
                  <span className="text-[#F6E85C] font-medium">bẫy Paraphrase</span>, làm chủ âm đuôi{" "}
                  <code className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 text-xs">-s / -ed</code>{" "}
                  và bứt phá điểm số Listening.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    const el = document.getElementById("live-mini-lab");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Mic className="w-4 h-4 stroke-[2.5]" />
                  <span>Luyện Chép Chính Tả Ngay</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("exercise-library");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 border border-indigo-400/40 text-white font-semibold text-sm backdrop-blur-md transition-colors"
                >
                  <span>Khám phá kho bài tập</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                    isPlaying
                      ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300"
                  }`}
                >
                  <Radio
                    className={`w-4 h-4 ${
                      isPlaying ? "animate-spin text-emerald-400" : "text-indigo-400"
                    }`}
                  />
                  <span>{isPlaying ? "Sóng Âm 3D Đang Phát" : "Kích hoạt Sóng Âm 3D"}</span>
                </button>
              </div>

              {/* Mini Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-xl">
                <div className="p-3.5 rounded-2xl bg-[#0C0E1D]/80 border border-[#2B3060]">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    MỤC TIÊU NGÀY
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">
                      {profile?.daily_study_minutes ?? 45}m
                    </span>
                    <span className="text-xs text-zinc-400">/ngày</span>
                    <span className="ml-auto text-[11px] text-indigo-300 font-semibold">
                      {attemptsCount} lượt bài
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-[#1B1F40] rounded-full overflow-hidden">
                    <div className="h-full w-[68%] bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0C0E1D]/80 border border-[#2B3060]">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    ĐỘ CHÍNH XÁC
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-black text-emerald-400">{accuracy}%</span>
                    <span className="text-[10px] text-emerald-300/80 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      IELTS Target
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-[#1B1F40] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0C0E1D]/80 border border-[#2B3060]">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    CẦN CẢI THIỆN
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-bold text-amber-300 block truncate">
                      Map & Âm đuôi -s/-ed
                    </span>
                    <span className="text-[11px] text-zinc-400">Độ chính xác: 62%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: 3D Sonic Neural Engine */}
            <div className="lg:col-span-5 flex flex-col gap-4 relative">
              <div className="relative rounded-2xl bg-[#0C0E1D]/90 border border-indigo-500/30 overflow-hidden shadow-2xl min-h-[300px] flex flex-col justify-between">
                {/* 3D Header Controls */}
                <div className="p-3.5 flex items-center justify-between border-b border-[#2B3060]/70 relative z-10 bg-[#0C0E1D]/50 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Activity
                      className={`w-4 h-4 ${
                        isPlaying ? "text-cyan-400 animate-pulse" : "text-indigo-400"
                      }`}
                    />
                    <span className="text-xs font-bold tracking-wide text-zinc-200">
                      3D SONIC NEURAL ENGINE
                    </span>
                  </div>

                  {/* Visual Mode Selector */}
                  <div className="flex items-center gap-1 bg-[#141731] p-0.5 rounded-lg border border-[#2B3060]">
                    {(
                      [
                        { id: "sphere" as const, label: "Orb" },
                        { id: "wave" as const, label: "Wave" },
                        { id: "matrix" as const, label: "Matrix" }
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setVisualMode(m.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                          visualMode === m.id
                            ? "bg-indigo-600 text-white shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Canvas */}
                <div className="relative flex-1 flex items-center justify-center">
                  <ThreeSonicVisualizer
                    isPlaying={isPlaying}
                    visualMode={visualMode}
                    playbackSpeed={playbackSpeed}
                    ambientNoise={ambientNoise}
                  />

                  {/* Floating Interaction Info */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 rounded-xl bg-[#141731]/85 border border-[#2B3060] backdrop-blur-md text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isPlaying ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                        }`}
                      />
                      <span className="text-zinc-300 font-medium truncate">
                        {isPlaying ? `Đang phát: ${currentTrack.title}` : "Di chuột để xoay sóng âm 3D"}
                      </span>
                    </div>
                    <span className="text-indigo-300 font-mono font-bold ml-2 shrink-0">
                      {playbackSpeed}x • {currentTrack.accent}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            2. LIVE MINI-LAB (CHÉP CHÍNH TẢ DIFF & BẪY PARAPHRASE)
        ========================================================= */}
        <LiveMiniLab playbackSpeed={playbackSpeed} onSpeak={speakText} />

        {/* =========================================================
            3. 4 CHẾ ĐỘ LUYỆN NGHE CHUYÊN SÂU (BENTO GRID)
        ========================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                4 Chế Độ Luyện Nghe Chuyên Sâu
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Chọn phương pháp phù hợp với giai đoạn ôn luyện của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bento 1: Deep Dictation */}
            <Link
              href="/dictation"
              className="lg:col-span-5 group relative rounded-3xl bg-gradient-to-br from-[#141731] via-[#10132B] to-[#1C153B] border border-amber-500/30 hover:border-amber-400 p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-amber-500/10 overflow-hidden"
            >
              <Mic className="w-28 h-28 text-amber-500/[0.07] absolute -right-4 -top-2 group-hover:scale-110 group-hover:text-amber-500/[0.12] transition-all duration-500 pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold tracking-wide uppercase">
                    ★ HIỆU QUẢ NHẤT
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-200 transition-colors">
                    Deep Dictation (Chép Chính Tả)
                  </h3>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                    Gõ chính xác từng từ trong câu nói. So khớp{" "}
                    <span className="text-amber-300 font-medium">diff ký tự tức thì</span> để chữa
                    triệt để lỗi nghe sót âm đuôi (<code className="text-amber-300">-s, -ed</code>
                    ), mạo từ và nối âm.
                  </p>
                </div>

                {/* Visual diff snippet */}
                <div className="p-3 rounded-2xl bg-[#0C0E1D] border border-[#2B3060] text-xs font-mono space-y-1">
                  <div className="text-zinc-400">Audio: "...two certified copies of transcripts"</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">✓ two</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      certifi<u>ed</u>
                    </span>
                    <span className="text-emerald-400">✓ copies</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2B3060]/70 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                <span className="underline underline-offset-4">Bắt đầu chép chính tả ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Bento 2: Speed Run */}
            <div className="lg:col-span-4 group relative rounded-3xl bg-[#141731] border border-[#2B3060] hover:border-rose-500/40 p-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/15 px-2.5 py-1 rounded-lg border border-rose-500/25">
                    Đang chọn: {bentoSpeedPreview}x
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Speed Run (1.25x - 1.5x)</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Tăng tốc độ nghe để rèn luyện phản xạ não bộ, giúp bài thi thật ở 1.0x trở nên chậm
                    rãi và dễ nắm bắt.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[1.0, 1.25, 1.5, 1.75].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setBentoSpeedPreview(spd);
                        setPlaybackSpeed(spd);
                        showToast(`Đặt tốc độ: ${spd}x`);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        bentoSpeedPreview === spd
                          ? "bg-rose-500/25 border-rose-400 text-rose-200"
                          : "bg-[#0C0E1D] border-[#2B3060] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter("SPEED");
                  document.getElementById("exercise-library")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-6 pt-4 border-t border-[#2B3060]/70 flex items-center justify-between text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
              >
                <span>Luyện phản xạ tốc độ cao</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Bento 3: Luyện Giọng Accents */}
            <div className="lg:col-span-3 group relative rounded-3xl bg-[#141731] border border-[#2B3060] hover:border-cyan-500/40 p-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Globe2 className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Luyện Giọng (Accents)</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Làm chủ các biến thể phát âm trong bài thi IELTS: Anh-Anh, Anh-Mỹ, và Anh-Úc.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { code: "UK", label: "🇬🇧 UK (50%)" },
                    { code: "US", label: "🇺🇸 US (30%)" },
                    { code: "AUS", label: "🇦🇺 AUS (20%)" }
                  ].map((acc) => (
                    <button
                      key={acc.code}
                      onClick={() => {
                        setBentoAccentPreview(acc.code);
                        setActiveFilter(acc.code);
                        document.getElementById("exercise-library")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        bentoAccentPreview === acc.code
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                          : "bg-[#0C0E1D] border-[#2B3060] text-zinc-300 hover:text-white"
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveFilter(bentoAccentPreview);
                  document.getElementById("exercise-library")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-6 pt-4 border-t border-[#2B3060]/70 flex items-center justify-between text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>Lọc giọng đọc ({bentoAccentPreview})</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Bento Banner 4: Full Test Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-[#141731] via-[#1B1B47] to-[#251A4C] border border-indigo-400/30 p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
            <div className="flex items-start sm:items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-lg shadow-indigo-500/20">
                <Award className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white">
                    Full Comprehension Test (Đề Thi Thử Chuẩn Phòng Thi)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold">
                    CAMBRIDGE FORMAT
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
                  Mô phỏng áp lực phòng thi thật với <strong className="text-white">4 Sections liên tục (40 câu hỏi, 30 phút)</strong>. Hệ thống bấm giờ tự động, khóa tua lại và chấm điểm chuẩn thang điểm IELTS 9.0.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenPracticeModal(allExercises[3] || allExercises[0])}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
            >
              <span>Vào thi thử Full Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* =========================================================
            4. KHO BÀI LUYỆN NGHE THỰC CHIẾN (SMART EXERCISE LIBRARY)
        ========================================================= */}
        <section id="exercise-library" className="space-y-6 pt-2 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Compass className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Kho Bài Luyện Nghe ({filteredExercises.length})
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Đang lọc theo: <strong className="text-indigo-300">{selectedStage.name} (Band {selectedStage.bandRange})</strong> • Tích hợp từ vựng & giải thích Paraphrase
              </p>
            </div>

            {/* Search & Only Uncompleted Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài nghe, chủ đề, Section..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#141731] border border-[#2B3060] focus:border-indigo-400 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setOnlyUncompleted(!onlyUncompleted)}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                  onlyUncompleted
                    ? "bg-indigo-600/25 border-indigo-400 text-indigo-200"
                    : "bg-[#141731] border-[#2B3060] text-zinc-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Chưa làm</span>
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "ALL", label: "Tất cả bài tập" },
              { id: "UK", label: "🇬🇧 UK Accent" },
              { id: "US", label: "🇺🇸 US Accent" },
              { id: "AUS", label: "🇦🇺 AUS Accent" },
              { id: "SPEED", label: "⚡ Speed Run (Ngắn)" },
              { id: "BAND_LOW", label: "Band 4.5 - 6.5" },
              { id: "BAND_MID", label: "Band 6.5 - 7.5" },
              { id: "BAND_HIGH", label: "Band 7.5 - 9.0" }
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                  activeFilter === chip.id
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-[#141731] border-[#2B3060] text-zinc-300 hover:bg-[#1B1F40] hover:text-white"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Exercise Grid */}
          {filteredExercises.length === 0 ? (
            <div className="rounded-3xl bg-[#141731] border border-[#2B3060] p-12 text-center space-y-3">
              <Headphones className="w-10 h-10 text-zinc-500 mx-auto" />
              <div className="text-base font-bold text-white">Không tìm thấy bài luyện nghe phù hợp</div>
              <p className="text-xs text-zinc-400">Hãy thử xóa bộ lọc hoặc tìm kiếm bằng từ khóa khác.</p>
              <button
                onClick={() => {
                  setActiveFilter("ALL");
                  setSearchQuery("");
                  setOnlyUncompleted(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExercises.map((ex) => {
                const isThisPlaying = currentTrack.id === ex.id && isPlaying;
                const isBookmarked = bookmarkedIds.includes(ex.id);

                return (
                  <article
                    key={ex.id}
                    className={`group rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 relative ${
                      isThisPlaying
                        ? "bg-gradient-to-b from-[#181C45] to-[#111435] border-indigo-400 shadow-xl shadow-indigo-500/15"
                        : "bg-[#141731] hover:bg-[#1B1F40] border-[#2B3060] hover:border-indigo-500/40"
                    }`}
                  >
                    <div>
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-gradient-to-r ${ex.badgeColor}`}
                          >
                            {ex.badge}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#0C0E1D] text-zinc-300 border border-[#2B3060]">
                            {ex.accentFlag} {ex.accent}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {ex.band}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleBookmark(ex.id)}
                            title={isBookmarked ? "Gỡ khỏi yêu thích" : "Lưu bài tập"}
                            aria-label="Lưu bài tập"
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                              isBookmarked
                                ? "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                                : "bg-[#0C0E1D] border-[#2B3060] text-zinc-400 hover:text-white"
                            }`}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${isBookmarked ? "fill-indigo-400 text-indigo-400" : ""}`}
                            />
                          </button>

                          <button
                            onClick={() => handlePreviewExercise(ex)}
                            title="Nghe thử"
                            aria-label="Nghe thử âm thanh"
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                              isThisPlaying
                                ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/40"
                                : "bg-[#0C0E1D] border-[#2B3060] text-zinc-300 hover:bg-indigo-600 hover:text-white"
                            }`}
                          >
                            <Headphones className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Subtitle */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                          <span>{ex.title}</span>
                          {ex.completed && (
                            <span title="Đã hoàn thành">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                          {ex.subtitle}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="mt-4 pt-3 border-t border-[#2B3060]/60 flex items-center justify-between text-xs text-zinc-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {ex.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            {ex.questionsCount} Câu hỏi
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-300/90">{ex.category}</span>
                      </div>

                      {/* Paraphrase & Vocab Trigger */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] bg-[#0C0E1D] px-3 py-1.5 rounded-xl border border-[#2B3060]/60">
                        <span className="text-amber-300/90 font-medium">
                          🎯 {ex.paraphraseTraps} bẫy Paraphrase
                        </span>
                        <button
                          onClick={() => setVocabPopoverId(vocabPopoverId === ex.id ? null : ex.id)}
                          className="text-cyan-300 hover:underline font-semibold"
                        >
                          {vocabPopoverId === ex.id ? "Đóng từ vựng" : "+ Xem từ vựng key"}
                        </button>
                      </div>

                      {/* Vocab Accordion */}
                      {vocabPopoverId === ex.id && (
                        <div className="mt-2 p-3 rounded-2xl bg-[#0C0E1D] border border-cyan-500/30 space-y-1.5 text-xs animate-fadeIn">
                          {ex.vocab.map((v, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="font-bold text-white">{v.word}</span>
                              <span className="text-zinc-400">{v.meaning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons: Nghe thử & Làm bài */}
                    <div className="mt-5 grid grid-cols-12 gap-2.5 pt-1">
                      <button
                        onClick={() => handlePreviewExercise(ex)}
                        className={`col-span-7 py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                          isThisPlaying
                            ? "bg-indigo-600/30 border-indigo-400 text-indigo-200"
                            : "bg-[#1B1F40] hover:bg-[#252A56] border-[#2B3060] text-zinc-200"
                        }`}
                      >
                        {isThisPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Đang phát thử...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Nghe thử</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenPracticeModal(ex)}
                        className="col-span-5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500 hover:to-orange-500 border border-amber-500/40 text-amber-300 hover:text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <span>Làm bài</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================
            5. CHUYÊN ĐỀ LUYỆN NGHE THEO CHỦ ĐỀ (TOPIC TRACKS)
        ========================================================= */}
        <section className="space-y-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Chuyên Đề Luyện Nghe Theo Chủ Đề
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Bao quát toàn diện các ngữ cảnh Section 1, 2, 3 và 4 kèm lộ trình kỹ năng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPIC_TRACKS.map((track) => {
              const IconComponent = track.icon;
              const isMastered = track.progress === 100;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    setSearchQuery(track.title.split(" ")[0]);
                    document.getElementById("exercise-library")?.scrollIntoView({ behavior: "smooth" });
                    showToast(`Lọc bài tập theo chuyên đề: ${track.title}`);
                  }}
                  className="group cursor-pointer rounded-3xl bg-[#141731] hover:bg-[#1B1F40] border border-[#2B3060] hover:border-indigo-500/40 p-6 flex flex-col justify-between transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-[#0C0E1D] border border-[#2B3060] flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-5 h-5" />
                      </div>

                      {isMastered ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Thành thạo</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                          {track.status}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {track.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">{track.subtitle}</p>
                    </div>

                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {track.skills.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[#0C0E1D] text-zinc-300 border border-[#2B3060]"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">{track.exercisesCount} bài tập</span>
                      <span className={`font-bold ${isMastered ? "text-emerald-400" : "text-white"}`}>
                        {track.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0C0E1D] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isMastered
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
                        }`}
                        style={{ width: `${track.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* =========================================================
          6. FLOATING CYBER AUDIO DOCK PLAYER
      ========================================================= */}
      <FloatingAudioDock
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={currentTrack.durationSec}
        playbackSpeed={playbackSpeed}
        ambientNoise={ambientNoise}
        isDockMinimized={isDockMinimized}
        isMuted={isMuted}
        abLoop={abLoop}
        currentTranscriptLine={currentTranscriptLine}
        onTogglePlay={handleTogglePlay}
        onSeek={(sec) => {
          const next = Math.max(0, Math.min(currentTrack.durationSec, currentTime + sec));
          setCurrentTime(next);
          if (audioRef.current) audioRef.current.currentTime = next;
        }}
        onSeekTo={(newTime) => {
          setCurrentTime(newTime);
          if (audioRef.current) audioRef.current.currentTime = newTime;
        }}
        onChangeSpeed={cycleSpeed}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleAbLoop={() => {
          setAbLoop(!abLoop);
          showToast(abLoop ? "Đã tắt lặp A-B" : "Đã bật lặp câu A-B");
        }}
        onSetAmbientNoise={(noise) => {
          setAmbientNoise(noise);
          showToast(noise === "off" ? "Môi trường: Chuẩn" : `Môi trường: ${noise}`);
        }}
        onSetDockMinimized={setIsDockMinimized}
      />

      {/* =========================================================
          7. QUICK PRACTICE MODAL (IN-PLACE TEST EXECUTION)
      ========================================================= */}
      {activePracticeExercise && (
        <QuickPracticeModal
          exercise={activePracticeExercise}
          playbackSpeed={playbackSpeed}
          onClose={() => setActivePracticeExercise(null)}
          onSeekTo={(sec) => {
            setCurrentTime(sec);
            if (audioRef.current) audioRef.current.currentTime = sec;
          }}
          onSpeak={speakText}
        />
      )}
    </div>
  );
}
