import type { Metadata } from "next";
import { getAccountLabel } from "@/features/auth/server/account";
import { getLearningOverview } from "@/features/learning/server/content";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { DashboardClient } from "./client";

export const metadata: Metadata = {
  title: "Dashboard | Indigo Scholar",
  description: "Your English learning command centre — lessons, progress, and daily goals.",
};

const planItems = [
  {
    title: "Vocabulary",
    detail: "Everyday words — spaced repetition",
    href: "/learn/vocabulary",
    iconName: "book-open-text",
    completed: true,
    progress: 100,
  },
  {
    title: "Grammar",
    detail: "Foundation practice",
    href: "/learn/grammar",
    iconName: "pen-line",
    completed: false,
    progress: 45,
  },
  {
    title: "Listening",
    detail: "Daily conversations",
    href: "/practice/listening",
    iconName: "headphones",
    completed: false,
    progress: 0,
  },
  {
    title: "Dictation",
    detail: "Listen & write it down",
    href: "/dictation",
    iconName: "mic-2",
    completed: false,
    progress: 0,
  },
];

function getLevel(band: number | null) {
  if (band === null || band < 4)
    return { code: "A1", label: "Beginner", progress: 60 };
  if (band < 5) return { code: "A2", label: "Elementary", progress: 35 };
  return { code: "B1", label: "Intermediate", progress: 10 };
}

const WORDS = [
  { word: "Serendipity", phonetics: "/ˌser.ənˈdip.ə.ti/", type: "noun", level: "C1", definition: "The occurrence of events by chance in a happy or beneficial way.", example: "Finding that book at the market was pure serendipity." },
  { word: "Ephemeral", phonetics: "/ɪˈfem.ər.əl/", type: "adjective", level: "C2", definition: "Lasting for a very short time.", example: "Fame in the world of rock and pop is largely ephemeral." },
  { word: "Resilience", phonetics: "/rɪˈzɪl.jəns/", type: "noun", level: "C1", definition: "The capacity to recover quickly from difficulties; toughness.", example: "The rescue workers showed remarkable resilience." },
  { word: "Ubiquitous", phonetics: "/juːˈbɪk.wɪ.təs/", type: "adjective", level: "C2", definition: "Present, appearing, or found everywhere.", example: "Mobile phones have become ubiquitous." },
  { word: "Pragmatic", phonetics: "/præɡˈmæt.ɪk/", type: "adjective", level: "C1", definition: "Dealing with things sensibly and realistically.", example: "We need a pragmatic approach to the problem." },
];

function getWordOfTheDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return WORDS[dayOfYear % WORDS.length];
}

function getDeterministicHeatmap(weekData: number[]) {
  return Array.from({ length: 35 }, (_, i) => {
    const base = weekData[i % 7] ?? 0;
    const noise = Math.floor(Math.sin(i * 12.345) * 10) - 2;
    return Math.max(0, base + noise);
  });
}

export default async function DashboardPage() {
  const [{ account, learnerProfile }, overview] = await Promise.all([
    requireCompletedOnboarding(),
    getLearningOverview(),
  ]);

  const accountLabel = getAccountLabel(account);
  const firstName = accountLabel.trim().split(/\s+/).at(-1) ?? accountLabel;
  const level = getLevel(learnerProfile.current_band);
  const dailyMinutes = learnerProfile.daily_study_minutes ?? 20;
  const nextLesson = overview.continueLesson ?? overview.nextLesson;
  const progress = Math.round(nextLesson?.progressPercent ?? 0);

  // Gamification data (will come from real DB in future)
  const streak = 12;
  const xp = 1450;
  const dailyGoal = { current: 2, total: 4 };
  const weekData = [15, 30, 45, 20, 0, 40, 25]; // Mon-Sun in minutes
  const wordOfTheDay = getWordOfTheDay();
  const heatData = getDeterministicHeatmap(weekData);
  // Add a fake streak freeze status for gamification showcase
  const hasStreakFreeze = true;

  return (
    <DashboardClient
      accountLabel={accountLabel}
      firstName={firstName}
      level={level}
      dailyMinutes={dailyMinutes}
      nextLesson={nextLesson}
      progress={progress}
      overview={overview}
      streak={streak}
      hasStreakFreeze={hasStreakFreeze}
      xp={xp}
      dailyGoal={dailyGoal}
      weekData={weekData}
      planItems={planItems}
      wordOfTheDay={wordOfTheDay}
      heatData={heatData}
    />
  );
}
