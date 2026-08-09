import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/internal/storage-cleanup/route";

afterEach(() => vi.restoreAllMocks());

describe("POST /api/internal/storage-cleanup", () => {
  it("correlates and safely logs a rejected request", async () => {
    const output = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new Request(
      "https://private.example.com/api/internal/storage-cleanup",
      {
        method: "POST",
        headers: {
          authorization: "Bearer do-not-log-this",
          "x-request-id": "req-cleanup-rejected",
        },
      },
    );

    const response = await POST(request as never);
    const body = await response.json();
    const serializedLog = String(output.mock.calls[0]?.[0]);

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("req-cleanup-rejected");
    expect(body.error.requestId).toBe("req-cleanup-rejected");
    expect(serializedLog).toContain("storage_cleanup.rejected");
    expect(serializedLog).not.toContain("do-not-log-this");
  });
});
