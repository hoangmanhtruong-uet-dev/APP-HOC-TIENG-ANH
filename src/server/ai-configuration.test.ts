import { afterEach, describe, expect, it, vi } from "vitest";

import { getSpeakingAiConfiguration } from "@/server/speaking/ai-review";
import { getWritingAiConfiguration } from "@/server/writing/ai-feedback";

const OPTIONAL_AI_ENV = [
  "OPENAI_API_KEY",
  "OPENAI_WRITING_MODEL",
  "WRITING_FEEDBACK_SIGNING_SECRET",
  "OPENAI_SPEAKING_TRANSCRIPTION_MODEL",
  "OPENAI_SPEAKING_FEEDBACK_MODEL",
  "SPEAKING_PIPELINE_SIGNING_SECRET",
] as const;

function disableAi() {
  for (const name of OPTIONAL_AI_ENV) vi.stubEnv(name, "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("optional AI provider configuration", () => {
  it("keeps both providers disabled when every optional value is absent", () => {
    disableAi();

    expect(getWritingAiConfiguration()).toBeNull();
    expect(getSpeakingAiConfiguration()).toBeNull();
  });

  it("keeps providers disabled for partial configuration", () => {
    disableAi();
    vi.stubEnv("OPENAI_API_KEY", "provider-key");
    vi.stubEnv("WRITING_FEEDBACK_SIGNING_SECRET", "w".repeat(32));
    vi.stubEnv("SPEAKING_PIPELINE_SIGNING_SECRET", "s".repeat(32));

    expect(getWritingAiConfiguration()).toBeNull();
    expect(getSpeakingAiConfiguration()).toBeNull();
  });

  it("enables providers only when every capability value is explicit", () => {
    disableAi();
    vi.stubEnv("OPENAI_API_KEY", "provider-key");
    vi.stubEnv("OPENAI_WRITING_MODEL", "writing-model");
    vi.stubEnv("WRITING_FEEDBACK_SIGNING_SECRET", "w".repeat(32));
    vi.stubEnv("OPENAI_SPEAKING_TRANSCRIPTION_MODEL", "transcription-model");
    vi.stubEnv("OPENAI_SPEAKING_FEEDBACK_MODEL", "feedback-model");
    vi.stubEnv("SPEAKING_PIPELINE_SIGNING_SECRET", "s".repeat(32));

    expect(getWritingAiConfiguration()).toMatchObject({
      model: "writing-model",
    });
    expect(getSpeakingAiConfiguration()).toMatchObject({
      transcriptionModel: "transcription-model",
      feedbackModel: "feedback-model",
    });
  });
});
