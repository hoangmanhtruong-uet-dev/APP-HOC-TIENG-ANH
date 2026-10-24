"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import "./dashboard.css";

import { ContinueHeroBanner } from "./components/ContinueHeroBanner";
import { StatsStrip } from "./components/StatsStrip";
import { TodaysPlan } from "./components/TodaysPlan";
import { StudyHeatmap } from "./components/StudyHeatmap";
import { QuickPracticeCard } from "./components/QuickPracticeCard";
import { TipsCarousel } from "./components/TipsCarousel";
import { DailyGoalCard } from "./components/DailyGoalCard";
import { WordOfTheDayCard } from "./components/WordOfTheDayCard";
import { WeeklyLeagueCard } from "./components/WeeklyLeagueCard";

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
  wordOfTheDay: {
    word: string;
    phonetics: string;
    type: string;
    level: string;
    definition: string;
    example: string;
  };
  heatData: number[];
  hasStreakFreeze?: boolean;
}

export function DashboardClient({
  accountLabel,
  firstName,
  level,
  nextLesson,
  progress,
  overview,
  streak,
  xp,
  dailyGoal,
  weekData,
  wordOfTheDay,
  heatData,
}: DashboardClientProps) {
  const [greeting, setGreeting] = useState("Good afternoon");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  // Compute total weekly time
  const totalWeeklyMinutes = Array.isArray(weekData)
    ? weekData.reduce((acc, m) => acc + m, 0)
    : 175;
  const weeklyHours = Math.floor(totalWeeklyMinutes / 60);
  const weeklyMins = totalWeeklyMinutes % 60;
  const thisWeekFormatted = `${weeklyHours}h ${weeklyMins}m`;

  // Lessons completed
  const lessonsDone = overview?.completedLessons ?? 0;

  // Active user initial for weekly league and avatar
  const userInitial = (firstName || accountLabel || "H").trim().charAt(0).toUpperCase();

  // Continue banner details
  const continueTitle = nextLesson?.skillTitle ?? nextLesson?.title ?? "Grammar";
  const continueDesc =
    nextLesson?.description ?? "Rules and structure drills. 5 new lessons are waiting.";
  const continueHref =
    nextLesson?.href ??
    (nextLesson?.slug
      ? `/learn/${nextLesson.skillSlug ?? "grammar"}/${nextLesson.slug}`
      : "/learn/grammar");
  const continueProgress = progress > 0 ? progress : 45;

  return (
    <div className="dashboard-scope">
      <div className="wrap">
        {/* Top Hero Section */}
        <section className="top" aria-label="Welcome and statistics summary">
          <div>
            <h1 id="hello">
              {greeting}, {firstName}
            </h1>
            <p>{streak}-day streak. Keep the momentum going.</p>
          </div>

          <div className="pills">
            <div className="pill">
              <i aria-hidden="true" />
              {streak}d <small>streak</small>
            </div>
            <div className="pill xp">
              <i aria-hidden="true" />
              {Number(xp).toLocaleString()} <small>XP</small>
            </div>
          </div>
        </section>

        {/* 2-Column Main Grid */}
        <div className="grid">
          {/* Main Left Column */}
          <div className="col">
            {/* 1. Continue Hero Banner */}
            <ContinueHeroBanner
              title={continueTitle}
              description={continueDesc}
              progressPercent={continueProgress}
              href={continueHref}
            />

            {/* 2. Stats Strip */}
            <StatsStrip
              lessonsDone={lessonsDone}
              streakDays={streak}
              thisWeekTime={thisWeekFormatted}
              level={level}
            />

            {/* 3. Today's Plan */}
            <TodaysPlan />

            {/* 4. Duo Section: Study Heatmap & Quick Practice */}
            <section className="duo" aria-label="Practice and activity">
              <div>
                <div className="head">
                  <h2>Study heatmap</h2>
                </div>
                <StudyHeatmap data={heatData} activeDays={32} totalTime="13h 0m" />
              </div>

              <div>
                <div className="head">
                  <h2>Quick practice</h2>
                  <Link href="/learn/vocabulary" prefetch={false}>
                    More
                  </Link>
                </div>
                <QuickPracticeCard />
              </div>
            </section>

            {/* 5. English Theory & Tips Carousel */}
            <TipsCarousel />
          </div>

          {/* Right Sticky Sidebar */}
          <aside className="side" aria-label="Goals and community">
            {/* Daily Goal */}
            <DailyGoalCard
              current={dailyGoal?.current ?? 2}
              total={dailyGoal?.total ?? 4}
            />

            {/* Word of the Day */}
            <WordOfTheDayCard wordInfo={wordOfTheDay} />

            {/* Weekly League */}
            <WeeklyLeagueCard userXp={xp} userInitial={userInitial} />
          </aside>
        </div>
      </div>
    </div>
  );
}
