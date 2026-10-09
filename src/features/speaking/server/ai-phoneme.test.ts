import { describe, expect, it } from "vitest";

import { evaluatePronunciationTranscript } from "./ai-phoneme";

describe("evaluatePronunciationTranscript", () => {
  it("evaluates sample transcript and calculates fluency and band score", () => {
    const transcript = "The quick brown fox jumps over the lazy dog";
    const durationSeconds = 5;

    const result = evaluatePronunciationTranscript(transcript, durationSeconds);

    expect(result.words).toHaveLength(9);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.pronunciationBand).toBeGreaterThanOrEqual(1.0);
    expect(result.pronunciationBand).toBeLessThanOrEqual(9.0);
  });

  it("handles empty transcript gracefully", () => {
    const result = evaluatePronunciationTranscript("", 10);
    expect(result.overallScore).toBe(0);
    expect(result.pronunciationBand).toBe(0);
    expect(result.words).toHaveLength(0);
  });
});
