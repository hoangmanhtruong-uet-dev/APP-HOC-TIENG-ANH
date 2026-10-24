"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Headphones,
  Flame,
  Bell,
  ChevronDown,
  Check,
  Activity,
  Mic,
  Globe2,
  ListTodo,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  Waves,
  AudioLines,
  Search,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  SlidersHorizontal,
  Calendar,
  X,
  Zap
} from "lucide-react";

import type { ListeningCatalogItem } from "@/features/listening/server/content";
import "./listening.css";

// 8 IELTS Band stages from curriculum
export interface BandStage {
  id: string;
  bandRange: string;
  name: string;
  vietnameseTitle: string;
  minBand: number;
  maxBand: number;
  accent: string;
  description: string;
  focus: string;
}

export const BAND_STAGES: BandStage[] = [
  {
    id: "starter",
    bandRange: "0.0 - 2.5",
    name: "Starter",
    vietnameseTitle: "Mất gốc Listening",
    minBand: 0,
    maxBand: 2.5,
    accent: "UK / Slow",
    description: "Nhận diện bảng chữ cái, đánh vần tên riêng, số điện thoại, ngày tháng.",
    focus: "Chính tả số, tên người, từ vựng sinh hoạt hàng ngày"
  },
  {
    id: "elementary",
    bandRange: "2.5 - 3.5",
    name: "Elementary",
    vietnameseTitle: "Nhập môn Nghe IELTS",
    minBand: 2.5,
    maxBand: 3.5,
    accent: "UK Standard",
    description: "Nghe hiểu các thông báo đơn giản, hội thoại ngắn ở quầy dịch vụ.",
    focus: "Điền form thông tin, nhận biết mốc thời gian và địa điểm"
  },
  {
    id: "pre-ielts",
    bandRange: "3.5 - 4.5",
    name: "Pre-IELTS",
    vietnameseTitle: "Nền tảng Listening",
    minBand: 3.5,
    maxBand: 4.5,
    accent: "UK / US",
    description: "Bắt đầu làm quen với các đoạn hội thoại Section 1 và Section 2 ngắn.",
    focus: "Section 1 Form completion & Section 2 Hướng dẫn du lịch"
  },
  {
    id: "foundation",
    bandRange: "4.5 - 5.5",
    name: "Foundation",
    vietnameseTitle: "Chinh phục B1+",
    minBand: 4.5,
    maxBand: 5.5,
    accent: "UK / US / AUS",
    description: "Phát triển kỹ năng nghe bắt từ khóa (keywords) và nhận diện bẫy phổ biến.",
    focus: "Trắc nghiệm Section 2 & Độc thoại Section 3 thảo luận nhóm"
  },
  {
    id: "intermediate",
    bandRange: "5.5 - 6.5",
    name: "Intermediate",
    vietnameseTitle: "Bứt phá Band 6.5",
    minBand: 5.5,
    maxBand: 6.5,
    accent: "Global Accents",
    description: "Nghe hiểu bài giảng học thuật Section 4, liên kết ý và xử lý câu hỏi Matching.",
    focus: "Paraphrase phức tạp & Điền tóm tắt bài giảng Section 4"
  },
  {
    id: "upper-intermediate",
    bandRange: "6.5 - 7.5",
    name: "Upper-Intermediate",
    vietnameseTitle: "Mục tiêu Du học & Định cư",
    minBand: 6.5,
    maxBand: 7.5,
    accent: "Native Speed",
    description: "Làm chủ tốc độ nói tự nhiên, nuốt âm, nối âm và ngữ điệu người bản ngữ.",
    focus: "Full Section 1-4 với độ chính xác cao > 30/40 câu"
  },
  {
    id: "advanced",
    bandRange: "7.5 - 8.5",
    name: "Advanced",
    vietnameseTitle: "Chuyên sâu Học thuật",
    minBand: 7.5,
    maxBand: 8.5,
    accent: "Diverse Accents",
    description: "Nhận biết thái độ, hàm ý ngầm của người nói trong các bài thuyết trình chuyên sâu.",
    focus: "Multiple Choice nhiều bẫy Section 3 & Lecture trừu tượng"
  },
  {
    id: "expert",
    bandRange: "8.5 - 9.0",
    name: "Expert",
    vietnameseTitle: "Master Tuyệt đối",
    minBand: 8.5,
    maxBand: 9.0,
    accent: "Complex Native",
    description: "Hoàn thiện tối đa độ nhạy âm thanh, phản xạ tức thì, điểm số 38-40/40 tuyệt đối.",
    focus: "Tốc độ 1.25x - 1.5x, từ vựng hiếm và bẫy logic tinh vi"
  }
];

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
  // 1. Initial State Setup
  const userTargetBand = profile?.target_band ?? 6.5;
  const initialStage = useMemo(() => {
    return (
      BAND_STAGES.find((s) => {
        if (s.maxBand === 9.0) {
          return userTargetBand >= s.minBand && userTargetBand <= 9.0;
        }
        return userTargetBand >= s.minBand && userTargetBand < s.maxBand;
      }) ?? BAND_STAGES[5] // default to Upper-Intermediate 6.5 - 7.5
    );
  }, [userTargetBand]);

  const [selectedStage, setSelectedStage] = useState<BandStage>(initialStage);
  const [isBandDropdownOpen, setIsBandDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeBandRange, setActiveBandRange] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(75);
  const [duration, setDuration] = useState<number>(185);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{
    id: string;
    title: string;
    subtitle: string;
    accent: string;
    bandRange: string;
    audioUrl?: string;
  }>({
    id: "community-library",
    title: "Community Library Visit & Membership",
    subtitle: "Section 1 • Daily Conversation",
    accent: "UK Accent",
    bandRange: "5.5 - 6.5",
    audioUrl: "/audio/listening/community-library-visit.wav"
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-dismiss toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Sync Audio Element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      try {
        const p = audioRef.current.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Autoplay restricted
          });
        }
      } catch {
        // Not implemented in test environment
      }
    } else {
      try {
        audioRef.current.pause();
      } catch {
        // Not implemented in test environment
      }
    }
  }, [isPlaying, currentTrack]);

  // Handle Play/Pause
  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  // Seek ±5 seconds
  const seekRelative = (seconds: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(
        0,
        Math.min(audioRef.current.currentTime + seconds, duration)
      );
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    } else {
      setCurrentTime((prev) => Math.max(0, Math.min(prev + seconds, duration)));
    }
    showToast(seconds > 0 ? `Đã tua tới +${seconds}s` : `Đã tua lùi ${seconds}s`);
  };

  // Cycle speed
  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const next = speeds[nextIdx];
    setPlaybackSpeed(next);
    showToast(`Tốc độ nghe: ${next}x`);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Quick preview trigger
  const handlePreviewTrack = (track: {
    id: string;
    title: string;
    subtitle: string;
    accent: string;
    bandRange: string;
    audioUrl?: string;
  }) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    showToast(`Đang nghe thử: ${track.title}`);
  };

  // 3. Built-in Curated Exercises
  const mockPracticeList = useMemo(() => {
    const baseList = [
      {
        slug: "community-library-visit",
        title: "Community Library Visit & Membership",
        summary: "Đăng ký thẻ thư viện và hỏi giờ mở cửa, quy định mượn sách.",
        category: "Daily Conversations",
        bandRange: "5.5 - 6.5",
        accent: "UK Accent",
        accentCode: "uk",
        difficulty: "Foundation",
        questionCount: 10,
        durationSeconds: 185,
        isNew: true,
        tag: "HOT",
        audioUrl: "/audio/listening/community-library-visit.wav"
      },
      {
        slug: "campus-accommodation-booking",
        title: "University Accommodation Services",
        summary: "Sinh viên năm nhất trao đổi về việc thuê ký túc xá và homestay ngoại ô.",
        category: "Campus Life",
        bandRange: "6.0 - 7.0",
        accent: "AUS Accent",
        accentCode: "aus",
        difficulty: "Intermediate",
        questionCount: 10,
        durationSeconds: 240,
        isNew: true,
        tag: "BAND 6.5+",
        audioUrl: "/audio/listening/community-library-visit.wav"
      },
      {
        slug: "ocean-renewable-energy",
        title: "Tidal & Wave Energy Research Lecture",
        summary: "Bài giảng học thuật về công nghệ khai thác năng lượng thủy triều ngoài khơi Scotland.",
        category: "Academic Lectures",
        bandRange: "7.0 - 8.5",
        accent: "UK Accent",
        accentCode: "uk",
        difficulty: "Advanced",
        questionCount: 10,
        durationSeconds: 320,
        isNew: false,
        tag: "BAND 7.5+",
        audioUrl: "/audio/listening/community-library-visit.wav"
      },
      {
        slug: "city-cycling-path-proposal",
        title: "City Council: Public Cycling Route Scheme",
        summary: "Thảo luận quy hoạch đường đạp xe đô thị, trắc nghiệm và gắn nhãn bản đồ Section 2.",
        category: "Maps & Plans",
        bandRange: "5.0 - 6.5",
        accent: "US Accent",
        accentCode: "us",
        difficulty: "Intermediate",
        questionCount: 10,
        durationSeconds: 210,
        isNew: false,
        tag: "MAP / DIAGRAM",
        audioUrl: "/audio/listening/community-library-visit.wav"
      },
      {
        slug: "coffee-industry-supply-chain",
        title: "Global Coffee Farming & Fair Trade",
        summary: "Tác động kinh tế của phong trào thương mại công bằng đối với nông dân trồng cà phê.",
        category: "Academic Lectures",
        bandRange: "6.5 - 8.0",
        accent: "US Accent",
        accentCode: "us",
        difficulty: "Upper-Intermediate",
        questionCount: 10,
        durationSeconds: 290,
        isNew: true,
        tag: "SECTION 4",
        audioUrl: "/audio/listening/community-library-visit.wav"
      },
      {
        slug: "lost-property-inquiry",
        title: "Airport Lost Property Hotline",
        summary: "Báo mất hành lý tại sân bay Sydney: màu sắc vali, thương hiệu, giấy tờ bên trong.",
        category: "Daily Conversations",
        bandRange: "0.0 - 4.5",
        accent: "AUS Accent",
        accentCode: "aus",
        difficulty: "Elementary",
        questionCount: 6,
        durationSeconds: 150,
        isNew: false,
        tag: "STARTER",
        audioUrl: "/audio/listening/community-library-visit.wav"
      }
    ];

    // Merge Supabase items if available
    if (items.length > 0) {
      const dbSlugs = new Set(items.map((i) => i.slug));
      const dbFormatted = items.map((dbItem) => ({
        slug: dbItem.slug,
        title: dbItem.title,
        summary: dbItem.summary || "Bài luyện nghe kiểm tra theo format chuẩn IELTS.",
        category: "IELTS Practice",
        bandRange: "5.5 - 7.5",
        accent: "UK / Global Accent",
        accentCode: "uk",
        difficulty: dbItem.difficulty || "Intermediate",
        questionCount: dbItem.questionCount || 10,
        durationSeconds: dbItem.durationSeconds || 240,
        isNew: true,
        tag: "VERIFIED",
        audioUrl: "/audio/listening/community-library-visit.wav"
      }));
      const remainingBase = baseList.filter((b) => !dbSlugs.has(b.slug));
      return [...dbFormatted, ...remainingBase];
    }

    return baseList;
  }, [items]);

  // 4. Filtering Logic
  const filteredPracticeList = useMemo(() => {
    return mockPracticeList.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Filter modes / accents
      if (activeFilter === "uk" && item.accentCode !== "uk") return false;
      if (activeFilter === "us" && item.accentCode !== "us") return false;
      if (activeFilter === "aus" && item.accentCode !== "aus") return false;
      if (activeFilter === "speed" && item.durationSeconds > 220) return false;

      // Band range filter
      if (activeBandRange === "0-4.5") {
        if (!item.bandRange.includes("0.0") && !item.bandRange.includes("5.0"))
          return false;
      } else if (activeBandRange === "4.5-6.5") {
        if (!item.bandRange.includes("5.5") && !item.bandRange.includes("6.0"))
          return false;
      } else if (activeBandRange === "6.5-7.5") {
        if (!item.bandRange.includes("6.5") && !item.bandRange.includes("7.0"))
          return false;
      } else if (activeBandRange === "7.5-9.0") {
        if (!item.bandRange.includes("7.5") && !item.bandRange.includes("8.0") && !item.bandRange.includes("8.5"))
          return false;
      }

      return true;
    });
  }, [mockPracticeList, searchQuery, activeFilter, activeBandRange]);

  // Exam Countdown calculation
  const examCountdown = useMemo(() => {
    if (!profile?.target_exam_date) return null;
    const targetDate = new Date(profile.target_exam_date);
    const now = new Date();
    const diffDays = Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays > 0 ? diffDays : null;
  }, [profile?.target_exam_date]);

  // Daily target minutes
  const targetDailyMinutes = profile?.daily_study_minutes ?? 20;

  return (
    <div className="listening-theme-root font-sans pb-36 -mx-4 -my-6 sm:-mx-6 sm:-my-8 lg:-mx-8 lg:-my-8 p-4 sm:p-6 lg:p-8">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (audioRef.current.duration) {
              setDuration(audioRef.current.duration);
            }
          }
        }}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#1B1F40] px-4 py-3 text-sm font-medium text-[#EEF0FF] shadow-2xl border border-[#3F478C] animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles size={16} className="text-[#F6E85C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HERO & HEADER SECTION */}
      <section className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-[#141731] border border-[#2B3060] px-6 py-10 md:px-12 md:py-14 text-white shadow-2xl">
        {/* Glow ambient spots */}
        <div className="absolute -top-1/3 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-1/3 -left-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

        {/* Top bar inside hero */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-xs font-bold tracking-widest text-indigo-300 uppercase">
                Listening Training Center
              </p>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Chào mừng trở lại, Scholar
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="flex items-center gap-2 bg-[#1B1F40]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#2B3060] shadow-sm">
              <Flame size={16} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold text-[#EEF0FF]">5 Ngày Streak</span>
            </div>

            {/* Exam Countdown */}
            {examCountdown && (
              <div className="hidden sm:flex items-center gap-2 bg-[#1B1F40]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#2B3060] shadow-sm">
                <Calendar size={14} className="text-indigo-400" />
                <span className="text-xs font-medium text-zinc-300">
                  Còn <strong className="text-white font-semibold">{examCountdown} ngày</strong> thi
                </span>
              </div>
            )}

            <button
              onClick={() => showToast("Bạn không có thông báo mới.")}
              aria-label="Thông báo"
              className="p-2.5 bg-[#1B1F40]/80 hover:bg-[#252A56] rounded-full border border-[#2B3060] text-zinc-300 hover:text-white transition-colors"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Main Hero Grid */}
        <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            {/* Interactive Band Selector Trigger */}
            <div className="relative inline-block mb-6">
              <button
                onClick={() => setIsBandDropdownOpen(!isBandDropdownOpen)}
                className="inline-flex items-center gap-2.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-4 py-2 transition-all group"
                aria-expanded={isBandDropdownOpen}
                aria-haspopup="true"
              >
                <Sparkles size={15} className="text-[#F6E85C]" />
                <span className="text-xs font-bold tracking-wider text-indigo-200 uppercase">
                  IELTS Band {selectedStage.bandRange} • {selectedStage.name}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-indigo-300 transition-transform duration-200 ${
                    isBandDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Band Dropdown Menu */}
              {isBandDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[420px] rounded-2xl bg-[#141731] border border-[#2B3060] p-3 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2B3060] px-2">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Chọn Chặng Luyện Nghe (0.0 - 9.0)
                    </p>
                    <button
                      onClick={() => setIsBandDropdownOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
                    {BAND_STAGES.map((stage) => {
                      const isSelected = selectedStage.id === stage.id;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => {
                            setSelectedStage(stage);
                            setIsBandDropdownOpen(false);
                            showToast(`Đã chuyển sang ${stage.name} (Band ${stage.bandRange})`);
                          }}
                          className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-indigo-600/30 border border-indigo-500/50"
                              : "hover:bg-[#1B1F40] border border-transparent"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                  isSelected
                                    ? "bg-indigo-500 text-white"
                                    : "bg-[#2B3060] text-indigo-200"
                                }`}
                              >
                                Band {stage.bandRange}
                              </span>
                              <span className="font-semibold text-sm text-white">
                                {stage.name}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-1">
                              {stage.vietnameseTitle}: {stage.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={18} className="text-[#F6E85C] shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              Luyện Nghe IELTS Thực Chiến <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-100 to-violet-300">
                Chuẩn Format & Phản Xạ Nhanh.
              </span>
            </h1>
            <p className="text-base text-zinc-300 max-w-[55ch] leading-relaxed mb-6">
              Luyện tập với âm thanh người bản ngữ đa quốc gia, nhận diện bẫy paraphrase và
              tăng tốc độ xử lý câu hỏi để tự tin bứt phá điểm số bài thi Listening.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dictation"
                className="inline-flex items-center gap-2 bg-[#F6E85C] hover:bg-[#F6E85C]/90 text-[#0C0E1D] font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <Mic size={16} />
                Luyện Chép Chính Tả
              </Link>
              <button
                onClick={() => {
                  const el = document.getElementById("practice-catalog-anchor");
                  if (typeof el?.scrollIntoView === "function") {
                    el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="inline-flex items-center gap-2 bg-[#1B1F40] hover:bg-[#252A56] text-white font-semibold text-sm px-5 py-2.5 rounded-xl border border-[#2B3060] transition-colors"
              >
                Khám phá kho bài tập
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Daily Goal & Accuracy Stats Card */}
          <div className="lg:col-span-5 w-full flex lg:justify-end">
            <div className="bg-[#1B1F40]/90 backdrop-blur-xl border border-[#2B3060] rounded-3xl p-6 md:p-7 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                    <Clock size={14} />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Mục Tiêu Ngày
                    </p>
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight text-white">
                    15
                    <span className="text-base font-medium text-zinc-400 ml-1">
                      / {targetDailyMinutes}m
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 mb-1 text-zinc-400">
                    <Award size={14} />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Độ Chính Xác
                    </p>
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight text-emerald-400">
                    {accuracy > 0 ? `${accuracy}%` : "78%"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full bg-[#0C0E1D] rounded-full overflow-hidden p-0.5 border border-[#2B3060]/50 mb-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                  style={{ width: "75%" }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Đã làm: <strong>{attemptsCount > 0 ? attemptsCount : 6} lượt bài</strong></span>
                <span className="text-emerald-400 font-semibold">Đạt 75% chỉ tiêu</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4 LISTENING MODES BENTO GRID */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EEF0FF] flex items-center gap-3">
            <AudioLines className="text-indigo-400" size={24} />
            4 Chế Độ Luyện Nghe Chuyên Sâu
          </h2>
          <span className="text-xs text-zinc-400 hidden sm:inline-block">
            Chọn phương pháp phù hợp với giai đoạn ôn luyện
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
          {/* Mode 1: Deep Dictation */}
          <Link
            href="/dictation"
            className="group lg:col-span-2 relative overflow-hidden rounded-3xl bg-[#141731] p-7 hover:bg-[#1B1F40] transition-all border border-[#2B3060] hover:border-amber-500/40 flex flex-col justify-between shadow-lg"
          >
            <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all text-amber-400 pointer-events-none">
              <Mic size={90} strokeWidth={1} />
            </div>
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                <Mic size={24} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Deep Dictation (Chép Chính Tả)
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Hiệu quả nhất
                </span>
              </div>
              <p className="text-sm text-zinc-300 max-w-[38ch] leading-relaxed mb-4">
                Gõ chính xác từng từ trong câu nói. So khớp diff ký tự tức thì để chữa triệt
                để lỗi nghe sót âm đuôi (-s, -ed), mạo từ và nối âm.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#2B3060]/60">
              <span className="text-xs font-semibold text-amber-400 group-hover:underline">
                Bắt đầu chép chính tả ngay
              </span>
              <ArrowRight
                size={18}
                className="text-zinc-400 group-hover:text-amber-400 group-hover:translate-x-1.5 transition-all"
              />
            </div>
          </Link>

          {/* Mode 2: Speed Run */}
          <button
            onClick={() => {
              setActiveFilter("speed");
              setPlaybackSpeed(1.25);
              showToast("Đã kích hoạt Speed Run: Lọc bài nhanh & đặt tốc độ 1.25x!");
              const el = document.getElementById("practice-catalog-anchor");
              if (typeof el?.scrollIntoView === "function") {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="group text-left relative overflow-hidden rounded-3xl bg-[#141731] p-6 hover:bg-[#1B1F40] transition-all border border-[#2B3060] hover:border-rose-500/40 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mb-4 group-hover:scale-110 transition-transform">
                <Activity size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                Speed Run (1.25x - 1.5x)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tăng tốc độ nghe lên 1.25x hoặc 1.5x để rèn luyện phản xạ não bộ, giúp bài thi thật trở nên chậm rãi và dễ nắm bắt.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#2B3060]/60">
              <span className="text-xs font-semibold text-rose-400">Luyện phản xạ</span>
              <ArrowRight
                size={16}
                className="text-zinc-400 group-hover:text-rose-400 group-hover:translate-x-1 transition-all"
              />
            </div>
          </button>

          {/* Mode 3: Accents Focus */}
          <button
            onClick={() => {
              setActiveFilter("uk");
              showToast("Đã lọc bài theo giọng Anh - Anh (UK Accent)");
              const el = document.getElementById("practice-catalog-anchor");
              if (typeof el?.scrollIntoView === "function") {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="group text-left relative overflow-hidden rounded-3xl bg-[#141731] p-6 hover:bg-[#1B1F40] transition-all border border-[#2B3060] hover:border-sky-500/40 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                <Globe2 size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                Luyện Giọng (Accents)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Làm chủ các biến thể phát âm trong bài thi IELTS: 🇬🇧 Anh-Anh, 🇺🇸 Anh-Mỹ, 🇦🇺 Anh-Úc.
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-[#1B1F40] border border-[#2B3060] px-2 py-0.5 rounded text-zinc-300">
                  🇬🇧 UK
                </span>
                <span className="text-[10px] bg-[#1B1F40] border border-[#2B3060] px-2 py-0.5 rounded text-zinc-300">
                  🇺🇸 US
                </span>
                <span className="text-[10px] bg-[#1B1F40] border border-[#2B3060] px-2 py-0.5 rounded text-zinc-300">
                  🇦🇺 AUS
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#2B3060]/60">
              <span className="text-xs font-semibold text-sky-400">Chọn giọng đọc</span>
              <ArrowRight
                size={16}
                className="text-zinc-400 group-hover:text-sky-400 group-hover:translate-x-1 transition-all"
              />
            </div>
          </button>

          {/* Mode 4: Full Comprehension Test Callout */}
          <div className="md:col-span-3 lg:col-span-4 relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 to-[#141731] p-7 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
              <Waves size={240} strokeWidth={1} />
            </div>
            <div className="relative z-10 flex gap-5 items-center">
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shrink-0">
                <ListTodo size={32} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Full Comprehension Test (Đề Thi Thử 4 Phần)
                  </h3>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <p className="text-sm text-zinc-300 max-w-[55ch] leading-relaxed">
                  Mô phỏng áp lực phòng thi thật với 4 Section hoàn chỉnh (40 câu hỏi, 30 phút).
                  Hệ thống bấm giờ tự động và chấm điểm chuẩn thang điểm IELTS 9.0.
                </p>
              </div>
            </div>
            <Link
              href="/practice/listening/community-library-visit"
              className="relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              Vào thi thử Full Test
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE FILTER TABS & SEARCH */}
      <section id="practice-catalog-anchor" className="mb-8 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EEF0FF] flex items-center gap-2.5">
              <Compass className="text-indigo-400" size={24} />
              Kho Bài Luyện Nghe ({filteredPracticeList.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Đang lọc theo: <strong>{selectedStage.name} (Band {selectedStage.bandRange})</strong>
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài nghe, chủ đề..."
              className="w-full bg-[#141731] border border-[#2B3060] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setActiveFilter("all");
              setActiveBandRange("all");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "all" && activeBandRange === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-[#141731] text-zinc-400 hover:text-white border border-[#2B3060]"
            }`}
          >
            Tất cả bài tập
          </button>
          <button
            onClick={() => setActiveFilter("uk")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "uk"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-[#141731] text-zinc-400 hover:text-white border border-[#2B3060]"
            }`}
          >
            🇬🇧 UK Accent
          </button>
          <button
            onClick={() => setActiveFilter("us")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "us"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-[#141731] text-zinc-400 hover:text-white border border-[#2B3060]"
            }`}
          >
            🇺🇸 US Accent
          </button>
          <button
            onClick={() => setActiveFilter("aus")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "aus"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-[#141731] text-zinc-400 hover:text-white border border-[#2B3060]"
            }`}
          >
            🇦🇺 AUS Accent
          </button>
          <button
            onClick={() => setActiveFilter("speed")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "speed"
                ? "bg-rose-600 text-white shadow-md"
                : "bg-[#141731] text-zinc-400 hover:text-white border border-[#2B3060]"
            }`}
          >
            ⚡ Speed Run (Ngắn)
          </button>

          <span className="w-px h-6 bg-[#2B3060] mx-1 shrink-0" />

          {/* Quick Band Filter Pills */}
          <button
            onClick={() => setActiveBandRange("0-4.5")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border ${
              activeBandRange === "0-4.5"
                ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                : "border-[#2B3060] text-zinc-400 hover:text-white"
            }`}
          >
            Band 0.0 - 4.5
          </button>
          <button
            onClick={() => setActiveBandRange("4.5-6.5")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border ${
              activeBandRange === "4.5-6.5"
                ? "border-indigo-400/60 bg-indigo-400/10 text-indigo-300"
                : "border-[#2B3060] text-zinc-400 hover:text-white"
            }`}
          >
            Band 4.5 - 6.5
          </button>
          <button
            onClick={() => setActiveBandRange("6.5-7.5")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border ${
              activeBandRange === "6.5-7.5"
                ? "border-violet-400/60 bg-violet-400/10 text-violet-300"
                : "border-[#2B3060] text-zinc-400 hover:text-white"
            }`}
          >
            Band 6.5 - 7.5
          </button>
          <button
            onClick={() => setActiveBandRange("7.5-9.0")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border ${
              activeBandRange === "7.5-9.0"
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                : "border-[#2B3060] text-zinc-400 hover:text-white"
            }`}
          >
            Band 7.5 - 9.0
          </button>
        </div>
      </section>

      {/* 4. TODAY'S PRACTICE EXERCISE CARDS */}
      <section className="mb-14">
        {filteredPracticeList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2B3060] bg-[#141731]/50 p-12 text-center">
            <Headphones className="mx-auto h-12 w-12 text-zinc-500 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              Không tìm thấy bài nghe phù hợp
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Thử đặt lại bộ lọc hoặc tìm kiếm với từ khóa khác.
            </p>
            <button
              onClick={() => {
                setActiveFilter("all");
                setActiveBandRange("all");
                setSearchQuery("");
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              Xem tất cả bài tập
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPracticeList.map((item) => {
              const isCurrentlyPlayingThis =
                isPlaying && currentTrack.title === item.title;

              return (
                <article
                  key={item.slug}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#2B3060] bg-[#141731] p-6 hover:bg-[#1B1F40] hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-md bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold text-indigo-300 uppercase tracking-wider border border-indigo-500/30">
                          {item.tag}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-[#2B3060]/50 px-2 py-1 text-[10px] font-medium text-zinc-300">
                          {item.accent}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          {item.bandRange}
                        </span>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B1F40] border border-[#2B3060] text-zinc-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
                        <Headphones size={18} />
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <h3 className="text-lg font-bold tracking-tight text-white mb-2 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-5">
                      {item.summary}
                    </p>
                  </div>

                  {/* Meta Stats & Actions */}
                  <div>
                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 mb-5 pb-4 border-b border-[#2B3060]/50">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-400" />
                        {Math.floor(item.durationSeconds / 60)}m {item.durationSeconds % 60}s
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ListTodo size={14} className="text-indigo-400" />
                        {item.questionCount} Câu hỏi
                      </span>
                      <span className="text-[11px] text-zinc-500 ml-auto">
                        {item.category}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handlePreviewTrack({
                            id: item.slug,
                            title: item.title,
                            subtitle: `${item.category} • ${item.bandRange}`,
                            accent: item.accent,
                            bandRange: item.bandRange,
                            audioUrl: item.audioUrl
                          })
                        }
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                          isCurrentlyPlayingThis
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                            : "bg-[#1B1F40] hover:bg-[#252A56] text-zinc-200 border-[#2B3060]"
                        }`}
                      >
                        {isCurrentlyPlayingThis ? (
                          <>
                            <Pause size={14} />
                            Đang phát
                          </>
                        ) : (
                          <>
                            <Play size={14} />
                            Nghe thử
                          </>
                        )}
                      </button>

                      <Link
                        href={`/practice/listening/${item.slug}`}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#F6E85C] hover:bg-[#F6E85C]/90 text-[#0C0E1D] flex items-center justify-center gap-1.5 transition-all shadow-md hover:-translate-y-0.5"
                      >
                        Làm bài
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. TOPICS & CATEGORIES SECTION */}
      <section className="pt-6 border-t border-[#2B3060]/60">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EEF0FF] flex items-center gap-2.5">
              <BookOpen className="text-indigo-400" size={24} />
              Chuyên Đề Luyện Nghe Theo Chủ Đề
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Bao quát toàn diện các ngữ cảnh Section 1, 2, 3 và 4
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Daily Conversations",
              vn: "Hội thoại đời sống (Section 1)",
              lessons: 14,
              progress: 85,
              icon: "💬"
            },
            {
              title: "Campus & Student Services",
              vn: "Môi trường học thuật (Section 2)",
              lessons: 12,
              progress: 60,
              icon: "🏫"
            },
            {
              title: "Academic Group Discussions",
              vn: "Thảo luận đề tài (Section 3)",
              lessons: 10,
              progress: 40,
              icon: "👥"
            },
            {
              title: "Academic Lectures",
              vn: "Bài giảng học thuật (Section 4)",
              lessons: 16,
              progress: 30,
              icon: "🔬"
            },
            {
              title: "Maps & Diagram Labeling",
              vn: "Bản đồ & Sơ đồ phương hướng",
              lessons: 8,
              progress: 75,
              icon: "🗺️"
            },
            {
              title: "Form & Table Completion",
              vn: "Điền form thông tin cá nhân",
              lessons: 15,
              progress: 100,
              isMastered: true,
              icon: "📝"
            }
          ].map((cat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#2B3060] bg-[#141731] p-5 hover:bg-[#1B1F40] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B1F40] text-xl border border-[#2B3060]">
                  {cat.icon}
                </div>
                {cat.isMastered ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 size={13} /> Thành thạo
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 px-2.5 py-1 rounded-full border border-indigo-500/25">
                    Đang học
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white mb-0.5">
                {cat.title}
              </h3>
              <p className="text-xs text-zinc-400 mb-4">{cat.vn}</p>

              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>{cat.lessons} bài tập</span>
                <span className="font-bold text-zinc-300">{cat.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#0C0E1D] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    cat.isMastered ? "bg-emerald-400" : "bg-indigo-500"
                  }`}
                  style={{ width: `${cat.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FLOATING MINI AUDIO PLAYER */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 pointer-events-none">
        <div className="pointer-events-auto listening-player-glass text-white rounded-3xl p-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row items-center gap-4 transition-all duration-300">
          
          {/* Track thumbnail & info */}
          <div className="flex items-center gap-3.5 w-full md:w-auto shrink-0">
            <div
              onClick={togglePlayPause}
              className="relative group cursor-pointer shrink-0"
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              <div className="h-12 w-12 rounded-2xl bg-indigo-600/30 flex items-center justify-center overflow-hidden border border-indigo-500/40 relative">
                <Headphones
                  size={20}
                  className={`text-indigo-300 ${isPlaying ? "animate-pulse" : ""}`}
                />
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                {isPlaying ? (
                  <Pause size={18} className="text-white" />
                ) : (
                  <Play size={18} className="text-white" fill="currentColor" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-[130px] max-w-[200px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest truncate">
                  {isPlaying ? "Đang phát" : "Sẵn sàng"}
                </p>
                <span className="text-[10px] text-zinc-400">• {currentTrack.accent}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold tracking-tight truncate text-white">
                {currentTrack.title}
              </p>
            </div>
          </div>

          {/* Scrub Bar & Waveform Preview */}
          <div className="flex-1 w-full flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-400 tabular-nums shrink-0">
              {Math.floor(currentTime / 60)}:
              {Math.floor(currentTime % 60)
                .toString()
                .padStart(2, "0")}
            </span>

            {/* Interactive Progress Bar */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                const newTime = clickPos * duration;
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setCurrentTime(newTime);
              }}
              className="flex-1 h-3 flex items-center cursor-pointer group relative"
              title="Tua đến vị trí"
            >
              <div className="w-full h-1.5 bg-[#0C0E1D] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-[#F6E85C] rounded-full relative transition-all"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`
                  }}
                />
              </div>

              {/* Animated mini wave bars */}
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none opacity-40">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] bg-indigo-300 wave-bar-anim"
                      style={{
                        animationDuration: `${0.6 + (i % 5) * 0.15}s`,
                        animationDelay: `${i * 0.05}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <span className="text-[11px] font-mono text-zinc-400 tabular-nums shrink-0">
              {Math.floor(duration / 60)}:
              {Math.floor(duration % 60)
                .toString()
                .padStart(2, "0")}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
            {/* Rewind 5s */}
            <button
              onClick={() => seekRelative(-5)}
              className="p-2 text-zinc-300 hover:text-white hover:bg-[#1B1F40] rounded-full transition-all"
              title="Tua lùi 5s"
              aria-label="Tua lùi 5 giây"
            >
              <RotateCcw size={16} />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Tạm dừng" : "Phát âm thanh"}
              className="h-10 w-10 bg-white text-[#0C0E1D] rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg font-bold"
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {/* Forward 5s */}
            <button
              onClick={() => seekRelative(5)}
              className="p-2 text-zinc-300 hover:text-white hover:bg-[#1B1F40] rounded-full transition-all"
              title="Tua tới 5s"
              aria-label="Tua tới 5 giây"
            >
              <RotateCw size={16} />
            </button>

            {/* Speed & Mute controls */}
            <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-[#2B3060]">
              <button
                onClick={cycleSpeed}
                aria-label={`Tốc độ phát ${playbackSpeed}x`}
                className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors tabular-nums ${
                  playbackSpeed > 1
                    ? "bg-[#F6E85C] text-[#0C0E1D]"
                    : "bg-[#1B1F40] text-zinc-300 hover:text-white"
                }`}
                title="Bấm để đổi tốc độ: 1.0x -> 1.25x -> 1.5x"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={toggleMute}
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                className="p-2 text-zinc-300 hover:text-white hover:bg-[#1B1F40] rounded-full transition-all"
                title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
