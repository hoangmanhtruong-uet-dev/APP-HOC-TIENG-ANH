import "server-only";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  streakFreezeCount: number;
  isStreakActiveToday: boolean;
  freezeUsedToday: boolean;
  lastActiveDate: string | null;
}

export function calculateStreakState(
  currentState: StreakState | null,
  activityDate: Date = new Date(),
): StreakState {
  const todayStr = activityDate.toISOString().split("T")[0];
  const yesterday = new Date(activityDate.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const twoDaysAgo = new Date(activityDate.getTime() - 48 * 60 * 60 * 1000);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

  const currentStreak = currentState?.currentStreak ?? 0;
  const longestStreak = currentState?.longestStreak ?? 0;
  const streakFreezeCount = currentState?.streakFreezeCount ?? 0;
  const lastActive = currentState?.lastActiveDate ?? null;

  if (lastActive === todayStr) {
    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      streakFreezeCount,
      isStreakActiveToday: true,
      freezeUsedToday: false,
      lastActiveDate: todayStr,
    };
  }

  if (lastActive === yesterdayStr) {
    const nextStreak = currentStreak + 1;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      streakFreezeCount,
      isStreakActiveToday: true,
      freezeUsedToday: false,
      lastActiveDate: todayStr,
    };
  }

  if (lastActive === twoDaysAgoStr && streakFreezeCount > 0) {
    // Consume 1 streak freeze to preserve streak!
    const nextStreak = currentStreak + 1;
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      streakFreezeCount: streakFreezeCount - 1,
      isStreakActiveToday: true,
      freezeUsedToday: true,
      lastActiveDate: todayStr,
    };
  }

  // Streak broken, starting new streak of 1
  return {
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, 1),
    streakFreezeCount,
    isStreakActiveToday: true,
    freezeUsedToday: false,
    lastActiveDate: todayStr,
  };
}
