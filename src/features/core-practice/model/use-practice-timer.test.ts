import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePracticeTimer } from "./use-practice-timer";

describe("usePracticeTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates initial remaining seconds accurately", () => {
    const serverNow = "2026-10-09T10:00:00.000Z";
    const expiresAt = "2026-10-09T10:20:00.000Z";

    const { result } = renderHook(() => usePracticeTimer(serverNow, expiresAt));

    expect(result.current.remainingSeconds).toBe(1200);
    expect(result.current.isExpired).toBe(false);
  });

  it("ticks down seconds over time", async () => {
    const serverNow = "2026-10-09T10:00:00.000Z";
    const expiresAt = "2026-10-09T10:00:10.000Z";

    const { result } = renderHook(() => usePracticeTimer(serverNow, expiresAt));

    expect(result.current.remainingSeconds).toBe(10);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remainingSeconds).toBe(7);
  });

  it("marks as expired when remainingSeconds hits 0", async () => {
    const serverNow = "2026-10-09T10:00:00.000Z";
    const expiresAt = "2026-10-09T10:00:05.000Z";

    const { result } = renderHook(() => usePracticeTimer(serverNow, expiresAt));

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });
});
