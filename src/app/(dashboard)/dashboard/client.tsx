"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Headphones,
  Mic2,
  Trophy,
  CheckCircle2,
  Zap,
  Target,
  Clock,
  PenLine,
  BarChart2,
  BookMarked,
  AlertCircle,
  ChevronRight,
  Star,
  Snowflake,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RevealFade } from "@/components/shared/reveal-stagger";
import { SkillCard } from "./components/SkillCard";
import { StudyHeatmap } from "./components/StudyHeatmap";
import { QuickQuiz } from "./components/QuickQuiz";
import { TheoryTipCard } from "./components/TheoryTipCard";
import { LevelProgress } from "./components/LevelProgress";

export interface DashboardClientProps {
  accountLabel: string;
  firstName: string;
  level: { code: string; label: string; progress: number };
  dailyMinutes: number;
  nextLesson: any;
  progress: number;
  overview: any;
  streak: number;
  xp: number;
  dailyGoal: { current: number; total: number };
  weekData: number[];
  planItems: any[];
  wordOfTheDay: { word: string; phonetics: string; type: string; level: string; definition: string; example: string };
  heatData: number[];
  hasStreakFreeze?: boolean;
}

const SKILLS = [
  {
    id: "vocabulary",
    label: "Vocabulary",
    desc: "Flashcards & spaced repetition",
    href: "/learn/vocabulary",
    Icon: BookOpen,
    colorClass: "bg-violet-50 text-violet-600 border-violet-100",
    accentClass: "bg-violet-600",
    tip: "Best time: morning",
    isNew: false,
  },
  {
    id: "grammar",
    label: "Grammar",
    desc: "Rules & structure drills",
    href: "/learn/grammar",
    Icon: PenLine,
    colorClass: "bg-sky-50 text-sky-600 border-sky-100",
    accentClass: "bg-sky-500",
    tip: "5 new lessons available",
    isNew: false,
  },
  {
    id: "listening",
    label: "Listening",
    desc: "Audio comprehension",
    href: "/practice/listening",
    Icon: Headphones,
    colorClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
    accentClass: "bg-emerald-500",
    tip: "Active listening training",
    isNew: false,
  },
  {
    id: "dictation",
    label: "Dictation",
    desc: "Listen & write exactly",
    href: "/dictation",
    Icon: Mic2,
    colorClass: "bg-rose-50 text-rose-600 border-rose-100",
    accentClass: "bg-rose-500",
    tip: "Best for IELTS / TOEIC",
    isNew: true,
  },
];

function StatChip({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="app-panel flex flex-col gap-2 px-4 py-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            accent ?? "bg-[var(--primary-subtle)] text-[var(--primary)]"
          )}
        >
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </p>
      </div>
      <p className="text-2xl font-black tracking-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

export function DashboardClient({
  accountLabel,
  firstName,
  level,
  dailyMinutes,
  nextLesson,
  progress,
  overview,
  streak,
  xp,
  dailyGoal,
  weekData,
  planItems,
  wordOfTheDay,
  heatData,
  hasStreakFreeze,
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [hour, setHour] = useState(12);

  useEffect(() => {
    
    setHour(new Date().getHours());
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const isNewUser = xp === 0 && (overview?.completedLessons ?? 0) === 0;

  const weeklyTotalMins = weekData.reduce((a, b) => a + b, 0);
  const weeklyHours = Math.floor(weeklyTotalMins / 60);
  const weeklyRemainder = weeklyTotalMins % 60;

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-4 pt-4 pb-24 sm:px-6 lg:min-h-full lg:px-2 lg:py-0 lg:pb-0">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              prefetch={false}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-base font-black text-white shadow-sm ring-2 ring-[var(--primary-soft)] ring-offset-1"
            >
              {accountLabel.slice(0, 1).toUpperCase()}
            </Link>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
                {greeting}, {firstName}
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                {isNewUser
                  ? "Welcome! Start your first lesson today."
                  : `${streak > 0 ? `${streak}-day streak. ` : ""}Keep the momentum going.`}
              </p>
            </div>
          </div>

          {/* Gamification chips */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer">
              {hasStreakFreeze ? (
                <Snowflake size={15} className="text-sky-500" />
              ) : (
                <Flame size={15} className="text-orange-500" />
              )}
              <span className="text-sm font-bold text-[var(--foreground)]">
                {streak}d
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer">
              <Trophy size={15} className="text-amber-500" />
              <span className="text-sm font-bold text-[var(--foreground)]">
                {xp.toLocaleString()} XP
              </span>
            </div>
            <Link
              href="/progress"
              prefetch={false}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm hover:scale-105 active:scale-95 transition-all hover:text-[var(--primary)]"
            >
              <BarChart2 size={15} />
              <span className="hidden sm:inline">Progress</span>
            </Link>
          </div>
        </header>

        {/* ── New user empty state ──────────────────────────────────────── */}
        {isNewUser ? (
          <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
            <div className="grid size-24 place-items-center rounded-full bg-[var(--primary-subtle)]">
              <Target size={44} className="text-[var(--primary)]" />
            </div>
            <div className="max-w-sm">
              <h2 className="text-2xl font-black text-[var(--foreground)]">
                Start your English journey
              </h2>
              <p className="mt-2 text-[var(--muted-foreground)] leading-relaxed">
                Take a 15-minute placement test so we can personalize your path
                from A1 to C2.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/placement-test"
                className="flex h-12 items-center gap-2 rounded-xl bg-[var(--primary)] px-8 text-sm font-bold text-white shadow-md transition-colors hover:bg-[var(--primary-hover)]"
              >
                Take Placement Test
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/learn"
                className="flex h-12 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-8 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                Start Beginner Lessons
              </Link>
            </div>
          </div>
        ) : (
          /* ── Main grid: 7/10 + 3/10 ─────────────────────────────────── */
          <div className="grid gap-8 lg:grid-cols-10 lg:items-start">
            {/* LEFT COLUMN ──────────────────────────────────────────────── */}
            <div className="space-y-7 lg:col-span-7">
              {/* Stats row */}
              <RevealFade>
                <section
                  className={cn(
                    "grid grid-cols-2 gap-3 sm:grid-cols-4 transition-all duration-500"
                  )}
                >
                <StatChip
                  icon={<BookMarked size={16} />}
                  value={String(overview?.completedLessons ?? 0)}
                  label="Lessons done"
                />
                <StatChip
                  icon={<Flame size={16} className="text-orange-500" />}
                  value={`${streak}d`}
                  label="Streak"
                  accent="bg-orange-50 text-orange-500"
                />
                <StatChip
                  icon={<Clock size={16} />}
                  value={
                    weeklyHours > 0
                      ? `${weeklyHours}h ${weeklyRemainder}m`
                      : `${weeklyTotalMins}m`
                  }
                  label="This week"
                />
                <LevelProgress
                  code={level.code}
                  label={level.label}
                  progress={level.progress}
                  mounted={mounted}
                />
              </section>
              </RevealFade>

              {/* Continue Learning card */}
              {nextLesson && (
                <RevealFade delay={0.1}>
                  <section>
                    <div className="mb-3 flex items-end justify-between">
                      <h2 className="app-section-title tracking-tighter">Continue Learning</h2>
                    <Link
                      href="/learn"
                      prefetch={false}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      All lessons <ChevronRight size={14} />
                    </Link>
                  </div>
                  <article className="app-panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
                        {nextLesson.moduleTitle}
                      </p>
                      <h3 className="mt-1.5 text-lg font-extrabold tracking-tight text-[var(--foreground)]">
                        {nextLesson.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[var(--muted-foreground)]">
                        <span>Progress</span>
                        <span className="text-[var(--primary)]">
                          {progress}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--success)] transition-all duration-1000"
                          style={{
                            width: mounted ? `${Math.max(4, progress)}%` : "0%",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between sm:flex-col sm:items-end sm:justify-center sm:gap-4">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
                        <Clock size={14} />
                        {nextLesson.estimatedMinutes} min
                      </span>
                      <Link
                        href={nextLesson.href}
                        prefetch={false}
                        className="flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                      >
                        Resume <ArrowRight size={16} />
                      </Link>
                    </div>
                  </article>
                </section>
                </RevealFade>
              )}

              {/* 4 skill cards */}
              <RevealFade delay={0.2}>
              <section>
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="app-section-title tracking-tighter">Features Overview</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SKILLS.map((skill) => {
                    const planItem = planItems.find((p) =>
                      p.href.includes(skill.id)
                    );
                    return (
                      <SkillCard
                        key={skill.id}
                        {...skill}
                        completed={planItem?.completed}
                        progressPct={planItem?.progress}
                      />
                    );
                  })}
                </div>
              </section>
              </RevealFade>

              {/* Learning Heatmap & Quick Quiz Grid */}
              <RevealFade delay={0.3}>
              <section className="grid gap-7 sm:grid-cols-2 lg:gap-8">
                {/* Heatmap */}
                <div>
                  <div className="mb-3 flex items-end justify-between">
                    <h2 className="app-section-title tracking-tighter">Study Heatmap</h2>
                  </div>
                  <div className="app-panel p-5 overflow-x-auto">
                    <StudyHeatmap data={heatData} />
                  </div>
                </div>

                {/* Quick Practice */}
                <div>
                  <div className="mb-3 flex items-end justify-between">
                    <h2 className="app-section-title tracking-tighter">Quick Practice</h2>
                    <Link
                      href="/learn"
                      prefetch={false}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      More <ChevronRight size={14} className="inline" />
                    </Link>
                  </div>
                  <div className="app-panel p-5">
                    <QuickQuiz />
                  </div>
                </div>
              </section>
              </RevealFade>

              {/* English Learning Tips */}
              <RevealFade delay={0.4}>
              <section>
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="app-section-title tracking-tighter">English Theory & Tips</h2>
                </div>
                <TheoryTipCard />
              </section>
              </RevealFade>
            </div>

            {/* RIGHT COLUMN ─────────────────────────────────────────────── */}
            <RevealFade delay={0.1}>
            <div className="space-y-5 lg:col-span-3">
              {/* Daily Goal */}
              <section>
                <div className="app-panel p-5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-subtle)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="font-extrabold tracking-tighter text-[var(--foreground)]">
                      Daily Goal
                    </h3>
                    <span className="text-sm font-bold text-[var(--success)]">
                      {dailyGoal.current}/{dailyGoal.total}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: dailyGoal.total }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2 flex-1 rounded-full transition-all duration-700",
                          mounted && i < dailyGoal.current
                            ? "bg-[var(--success)]"
                            : "bg-[var(--muted)]"
                        )}
                        style={{ transitionDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                    {dailyGoal.current >= dailyGoal.total
                      ? "Goal complete! Excellent work today."
                      : `${dailyGoal.total - dailyGoal.current} more ${
                          dailyGoal.total - dailyGoal.current === 1
                            ? "exercise"
                            : "exercises"
                        } to complete your goal.`}
                  </p>
                </div>
              </section>

              {/* Today's Plan */}
              <section>
                <div className="mb-3 flex items-end justify-between">
                  <h3 className="font-extrabold tracking-tighter text-[var(--foreground)]">
                    Today's Plan
                  </h3>
                  <Link
                    href="/learn"
                    prefetch={false}
                    className="text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    See all
                  </Link>
                </div>
                <div className="space-y-2">
                  {planItems.map((item) => {
                    const skill = SKILLS.find((s) => item.href.includes(s.id));
                    const Icon = skill?.Icon ?? BookOpen;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        className="group app-panel flex items-center gap-3 px-3 py-3 transition-all hover:shadow-[0_6px_20px_rgb(var(--shadow-color)/0.09)] hover:-translate-y-px active:scale-[0.98]"
                      >
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl",
                            item.completed
                              ? "bg-[var(--success-subtle)] text-[var(--success)]"
                              : skill?.colorClass ??
                                  "bg-[var(--primary-subtle)] text-[var(--primary)]"
                          )}
                        >
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm font-bold text-[var(--foreground)]">
                            {item.title}
                          </strong>
                          {item.completed ? (
                            <span className="text-[11px] font-semibold text-[var(--success)]">
                              Completed
                            </span>
                          ) : (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
                                <div
                                  className="h-full rounded-full bg-amber-400 transition-all duration-700"
                                  style={{
                                    width: mounted
                                      ? `${item.progress ?? 0}%`
                                      : "0%",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                                {item.progress ?? 0}%
                              </span>
                            </div>
                          )}
                        </span>
                        {item.completed ? (
                          <CheckCircle2
                            size={18}
                            className="shrink-0 text-[var(--success)]"
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Error review CTA */}
              <section>
                <Link href="/error-notebook" className="block group">
                  <div className="app-panel flex items-center gap-3 p-4 transition-all hover:shadow-[0_6px_20px_rgb(var(--shadow-color)/0.09)] active:scale-[0.98]">
                    <div className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--destructive-subtle)] text-[var(--destructive)]">
                      <div className="absolute inset-0 rounded-xl bg-[var(--destructive)] opacity-20 animate-ping group-hover:animate-none" />
                      <AlertCircle size={18} className="relative z-10" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        Review Mistakes
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        5 grammar errors waiting
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              </section>

              {/* Word of the Day */}
              <section>
                <h3 className="mb-3 font-extrabold tracking-tighter text-[var(--foreground)]">
                  Word of the Day
                </h3>
                <div className="app-panel p-5 group transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-black tracking-tight text-[var(--foreground)]">
                          {wordOfTheDay.word}
                        </p>
                        <button 
                          onClick={() => {
                            const utterance = new SpeechSynthesisUtterance(wordOfTheDay.word);
                            utterance.lang = "en-US";
                            window.speechSynthesis.speak(utterance);
                          }}
                          className="grid size-6 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] hover:scale-110 active:scale-95 transition-transform"
                          aria-label="Listen to pronunciation"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] font-medium mt-0.5">
                        {wordOfTheDay.phonetics} · {wordOfTheDay.type}
                      </p>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      <Star size={9} />
                      {wordOfTheDay.level}
                    </span>
                  </div>
                  <div className="relative overflow-hidden h-14 transition-all duration-300">
                    <div className="absolute inset-0 transition-transform duration-300 transform translate-y-0 group-hover:-translate-y-full flex items-center">
                      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-2">
                        {wordOfTheDay.definition}
                      </p>
                    </div>
                    <div className="absolute inset-0 transition-transform duration-300 transform translate-y-full group-hover:translate-y-0 flex items-center">
                      <p className="text-sm italic text-[var(--foreground)] border-l-2 border-[var(--primary-soft)] pl-3 line-clamp-2">
                        "{wordOfTheDay.example}"
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/learn/vocabulary"
                    className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    <Zap size={12} />
                    Add to my word list
                  </Link>
                </div>
              </section>

              {/* Weekly league snippet */}
              <section>
                <div className="app-panel border-orange-100 bg-orange-50/20 p-5 group hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-orange-500 group-hover:animate-bounce" />
                      <h3 className="font-extrabold tracking-tighter text-[var(--foreground)]">
                        Weekly League
                      </h3>
                    </div>
                    <Link href="/leaderboard" className="text-xs font-semibold text-orange-600 hover:underline">
                      View full
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {/* Rank above */}
                    <div className="flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center text-xs font-bold text-[var(--muted-foreground)]">
                          6
                        </span>
                        <img
                          src="https://i.pravatar.cc/150?u=user1"
                          className="size-7 rounded-full"
                          alt="Nam Hoàng"
                        />
                        <span className="text-sm font-semibold">Nam Hoàng</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--muted-foreground)]">
                        1,500 XP
                      </span>
                    </div>
                    {/* Current user */}
                    <div className="relative z-10 flex items-center justify-between rounded-xl bg-white px-2 py-2 shadow-sm ring-1 ring-orange-300/40 border border-orange-100 transform scale-[1.02] -my-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center text-xs font-black text-orange-600">
                          7
                        </span>
                        <div className="grid size-7 place-items-center rounded-full bg-[var(--primary)] text-[10px] font-black text-white">
                          {accountLabel.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm font-black text-[var(--foreground)]">
                          You
                        </span>
                      </div>
                      <span className="text-xs font-black text-orange-600">
                        {xp.toLocaleString()} XP
                      </span>
                    </div>
                    {/* Rank below */}
                    <div className="flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center text-xs font-bold text-[var(--muted-foreground)]">
                          8
                        </span>
                        <img
                          src="https://i.pravatar.cc/150?u=user2"
                          className="size-7 rounded-full"
                          alt="Minh Thư"
                        />
                        <span className="text-sm font-semibold">Minh Thư</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--muted-foreground)]">
                        1,410 XP
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[11px] font-semibold text-orange-700">
                    +51 XP overtakes rank 6
                    <Zap size={11} className="inline ml-1" />
                  </p>
                </div>
              </section>
            </div>
            </RevealFade>
          </div>
        )}
      </div>
    </div>
  );
}
