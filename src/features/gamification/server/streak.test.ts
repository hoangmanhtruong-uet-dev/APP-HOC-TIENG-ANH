import { describe, expect, it } from "vitest";

import { calculateStreakState } from "./streak";

describe("calculateStreakState", () => {
  const today = new Date("2026-10-09T12:00:00.000Z");

  it("increments streak when active on consecutive days", () => {
    const initialState = {
      currentStreak: 5,
      longestStreak: 10,
      streakFreezeCount: 1,
      isStreakActiveToday: false,
      freezeUsedToday: false,
      lastActiveDate: "2026-10-08",
    };

    const result = calculateStreakState(initialState, today);
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(10);
    expect(result.isStreakActiveToday).toBe(true);
  });

  it("uses streak freeze when missed exactly 1 day and freeze is available", () => {
    const initialState = {
      currentStreak: 8,
      longestStreak: 8,
      streakFreezeCount: 2,
      isStreakActiveToday: false,
      freezeUsedToday: false,
      lastActiveDate: "2026-10-07", // 2 days ago
    };

    const result = calculateStreakState(initialState, today);
    expect(result.currentStreak).toBe(9);
    expect(result.streakFreezeCount).toBe(1);
    expect(result.freezeUsedToday).toBe(true);
  });

  it("resets streak to 1 when missed 2+ days without freeze", () => {
    const initialState = {
      currentStreak: 15,
      longestStreak: 15,
      streakFreezeCount: 0,
      isStreakActiveToday: false,
      freezeUsedToday: false,
      lastActiveDate: "2026-10-05", // 4 days ago
    };

    const result = calculateStreakState(initialState, today);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(15);
  });
});
