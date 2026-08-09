import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/internal/client-errors/route";

afterEach(() => vi.restoreAllMocks());

describe("POST /api/internal/client-errors", () => {
  it("accepts only safe boundary metadata and returns a request ID", async () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new Request(
      "https://app.example/api/internal/client-errors",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
          "x-request-id": "req-client-safe",
        },
        body: JSON.stringify({ boundary: "route", digest: "digest-123" }),
      },
    );

    const response = await POST(request as never);
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(response.headers.get("x-request-id")).toBe("req-client-safe");
    expect(body.requestId).toBe("req-client-safe");
    expect(String(output.mock.calls[0]?.[0])).toContain("digest-123");
  });

  it("rejects arbitrary browser error content", async () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new Request(
      "https://app.example/api/internal/client-errors",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boundary: "route",
          digest: "digest-123",
          stack: "private browser stack",
          email: "learner@example.com",
        }),
      },
    );

    const response = await POST(request as never);
    expect(response.status).toBe(400);
    expect(output).not.toHaveBeenCalled();
  });
});
