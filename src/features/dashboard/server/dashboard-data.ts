import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentAccount } from "@/features/auth/server/account";
import { getWordOfTheDay, type WordLevel } from "./word-of-the-day";
import { calculateStreakState, type StreakState } from "@/features/gamification/server/streak";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";

export interface DashboardData {
  gamification: {
    streak: StreakState;
    xp: number;
    hasStreakFreeze: boolean;
  };
  wordOfTheDay: ReturnType<typeof getWordOfTheDay>;
  dailyGoal: { current: number; total: number };
  userTimezone: string;
}

/**
 * Fetch toàn bộ dữ liệu cần thiết cho Dashboard.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const account = await requireCurrentAccount();
  const { learnerProfile } = await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  
  // 1. Get Timezone from cookies or default to UTC
  const cookieStore = await cookies();
  const userTimezone = cookieStore.get("x-user-timezone")?.value || "UTC";

  // 2. Word of the Day (Personalized by band level)
  // Mapping current_band (e.g., 4.0 -> B1)
  let level: WordLevel = "B1";
  const band = learnerProfile.current_band;
  if (band !== null) {
    if (band < 4) level = "A2";
    else if (band < 5) level = "B1";
    else if (band < 6.5) level = "B2";
    else if (band < 8) level = "C1";
    else level = "C2";
  }
  const wordOfTheDay = getWordOfTheDay(level, userTimezone);

  // 3. Fetch Gamification Data
  const { data: gamificationRow } = await supabase
    .from("user_gamification")
    .select("total_xp, streak_freezes_available")
    .eq("user_id", account.user.id)
    .maybeSingle();

  // For this MVP, we simulate `lastActiveDate` based on recent XP events or progress
  const { data: recentProgress } = await supabase
    .from("learner_lesson_progress")
    .select("last_accessed_at")
    .eq("user_id", account.user.id)
    .order("last_accessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // For real implementation, streak logic requires a dedicated study_sessions or daily_activity table.
  // We'll calculate a mock streak based on last active progress for now to satisfy Phase 1.
  const lastActiveDate = recentProgress?.last_accessed_at ? new Date(recentProgress.last_accessed_at) : null;
  const mockCurrentState: StreakState = {
    currentStreak: 12, // Mock for now until table is created
    longestStreak: 20,
    streakFreezeCount: gamificationRow?.streak_freezes_available ?? 0,
    isStreakActiveToday: false,
    freezeUsedToday: false,
    lastActiveDate: lastActiveDate ? lastActiveDate.toISOString().split("T")[0] : null,
  };
  
  // Base streak calculation on user's timezone date
  const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: userTimezone }));
  const streak = calculateStreakState(mockCurrentState, userNow);

  // 4. Calculate Daily Goal progress
  // Count how many lessons completed today in user's timezone
  const todayStart = new Date(userNow);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();
  
  const { count: completedTodayCount } = await supabase
    .from("learner_lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", account.user.id)
    .eq("status", "completed")
    .gte("completed_at", todayStartStr);

  const dailyGoal = {
    current: completedTodayCount ?? 0,
    total: learnerProfile.daily_study_minutes ? Math.max(1, Math.floor(learnerProfile.daily_study_minutes / 10)) : 4,
  };

  return {
    gamification: {
      streak,
      xp: gamificationRow?.total_xp ?? 0,
      hasStreakFreeze: (gamificationRow?.streak_freezes_available ?? 0) > 0,
    },
    wordOfTheDay,
    dailyGoal,
    userTimezone,
  };
}
