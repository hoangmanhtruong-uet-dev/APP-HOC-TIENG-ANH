import { afterEach, describe, expect, it, vi } from "vitest";

import { logServerEvent } from "@/server/observability/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("structured server logger", () => {
  it("writes a correlated JSON event", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => {});

    logServerEvent("info", {
      event: "auth.request.completed",
      requestId: "req-safe",
      route: "registerAction",
      stage: "complete",
      metadata: { result: "accepted", count: 1 },
    });

    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: "info",
      event: "auth.request.completed",
      requestId: "req-safe",
      route: "registerAction",
      stage: "complete",
      metadata: { result: "accepted", count: 1 },
    });
    expect(record.timestamp).toEqual(expect.any(String));
  });

  it("redacts nested sensitive fields and sanitizes error text", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error(
      "request failed for learner@example.com Authorization: Bearer abc.def.ghi",
    );

    logServerEvent("error", {
      event: "cleanup.failed",
      requestId: "req-redaction",
      route: "/api/internal/storage-cleanup",
      stage: "delete storage objects",
      error,
      metadata: {
        authorization: "Bearer top-secret",
        cookie: "session=private",
        apiKey: "sk-private",
        essayContent: "private essay",
        transcript: "private transcript",
        nested: {
          signedUrl: "https://example.test/private?token=abc",
          safeCount: 3,
        },
      },
    });

    const serialized = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(serialized);
    expect(serialized).not.toContain("top-secret");
    expect(serialized).not.toContain("private essay");
    expect(serialized).not.toContain("private transcript");
    expect(serialized).not.toContain("learner@example.com");
    expect(serialized).not.toContain("abc.def.ghi");
    expect(record.metadata).toMatchObject({
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      apiKey: "[REDACTED]",
      essayContent: "[REDACTED]",
      transcript: "[REDACTED]",
      nested: { signedUrl: "[REDACTED]", safeCount: 3 },
    });
    expect(record.error.name).toBe("Error");
    expect(record.error.stack).toEqual(expect.any(String));
  });
});
