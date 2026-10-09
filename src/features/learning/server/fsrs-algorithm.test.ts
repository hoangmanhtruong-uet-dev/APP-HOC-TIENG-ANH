import { describe, expect, it } from "vitest";

import { calculateNextSRSState } from "./fsrs-algorithm";

describe("calculateNextSRSState", () => {
  const now = new Date("2026-10-09T10:00:00.000Z");

  it("calculates initial state for first review with good rating", () => {
    const result = calculateNextSRSState(null, "good", now);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.dueAt).toBe("2026-10-10T10:00:00.000Z");
  });

  it("resets repetitions and sets 1-day interval when rated again", () => {
    const initialState = {
      repetitions: 3,
      intervalDays: 15,
      easinessFactor: 2.5,
      lastReviewedAt: "2026-09-24T10:00:00.000Z",
      dueAt: "2026-10-09T10:00:00.000Z",
    };

    const result = calculateNextSRSState(initialState, "again", now);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.dueAt).toBe("2026-10-10T10:00:00.000Z");
  });

  it("increases interval exponentially on consecutive easy ratings", () => {
    const initialState = {
      repetitions: 2,
      intervalDays: 6,
      easinessFactor: 2.5,
      lastReviewedAt: "2026-10-03T10:00:00.000Z",
      dueAt: "2026-10-09T10:00:00.000Z",
    };

    const result = calculateNextSRSState(initialState, "easy", now);
    expect(result.repetitions).toBe(3);
    expect(result.intervalDays).toBeGreaterThan(6);
    expect(result.easinessFactor).toBeGreaterThan(2.5);
  });
});
