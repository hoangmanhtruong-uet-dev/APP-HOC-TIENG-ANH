import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/ready/route";

const REQUIRED_ENV = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  NEXT_PUBLIC_SITE_URL: "https://private.example.com",
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com",
  SPEAKING_PIPELINE_SIGNING_SECRET: "s".repeat(32),
  SUPABASE_SERVICE_ROLE_KEY: "server-only-value",
  STORAGE_CLEANUP_SECRET: "c".repeat(32),
} as const;

function stubRequiredEnvironment() {
  for (const [name, value] of Object.entries(REQUIRED_ENV)) {
    vi.stubEnv(name, value);
  }
  for (const name of [
    "OPENAI_API_KEY",
    "OPENAI_WRITING_MODEL",
    "WRITING_FEEDBACK_SIGNING_SECRET",
    "OPENAI_SPEAKING_TRANSCRIPTION_MODEL",
    "OPENAI_SPEAKING_FEEDBACK_MODEL",
  ]) {
    vi.stubEnv(name, "");
  }
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string | URL) => {
      const pathname = new URL(String(url)).pathname;
      if (pathname === "/auth/v1/health")
        return Promise.resolve(new Response(null, { status: 200 }));
      if (pathname === "/rest/v1/learning_modules")
        return Promise.resolve(Response.json([]));
      if (pathname === "/storage/v1/bucket/speaking-recordings")
        return Promise.resolve(
          Response.json({ id: "speaking-recordings", public: false }),
        );
      return Promise.resolve(new Response(null, { status: 404 }));
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/health/ready", () => {
  it("is ready with optional AI explicitly disabled", async () => {
    stubRequiredEnvironment();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      status: "ready",
      dependencies: {
        auth: "ready",
        database: "ready",
        storage: "ready",
      },
      optionalAi: {
        overall: "disabled",
        writing: "disabled",
        speaking: "disabled",
      },
    });
  });

  it("preserves a valid request ID in the response header", async () => {
    stubRequiredEnvironment();
    const request = new Request(
      "https://private.example.com/api/health/ready",
      {
        headers: { "x-request-id": "req-ready-correlation" },
      },
    );

    const response = await GET(request as never);
    expect(response.headers.get("x-request-id")).toBe("req-ready-correlation");
  });

  it("stays core-ready but reports degraded optional AI", async () => {
    stubRequiredEnvironment();
    vi.stubEnv("OPENAI_WRITING_MODEL", "partial-writing-model");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("degraded");
    expect(body.data.optionalAi).toMatchObject({
      overall: "misconfigured",
      writing: "misconfigured",
    });
  });

  it.each([
    "SUPABASE_SERVICE_ROLE_KEY",
    "STORAGE_CLEANUP_SECRET",
    "SPEAKING_PIPELINE_SIGNING_SECRET",
  ] as const)(
    "returns a clear 503 when %s is missing without leaking values",
    async (missingName) => {
      stubRequiredEnvironment();
      vi.stubEnv(missingName, "");

      const response = await GET();
      const body = await response.json();
      const serialized = JSON.stringify(body);

      expect(response.status).toBe(503);
      expect(body.error.code).toBe("CONFIGURATION_ERROR");
      expect(body.details.fields).toContain(missingName);
      expect(serialized).not.toContain(REQUIRED_ENV.SUPABASE_SERVICE_ROLE_KEY);
      expect(serialized).not.toContain(
        REQUIRED_ENV.SPEAKING_PIPELINE_SIGNING_SECRET,
      );
    },
  );

  it("returns a generic 503 when the database check fails", async () => {
    stubRequiredEnvironment();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string | URL) => {
        const pathname = new URL(String(url)).pathname;
        if (pathname === "/rest/v1/learning_modules") {
          return Promise.resolve(
            Response.json(
              { message: "sensitive database payload" },
              { status: 503 },
            ),
          );
        }
        if (pathname === "/storage/v1/bucket/speaking-recordings") {
          return Promise.resolve(
            Response.json({ id: "speaking-recordings", public: false }),
          );
        }
        return Promise.resolve(new Response(null, { status: 200 }));
      }),
    );

    const response = await GET();
    const serialized = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(serialized).toContain("DEPENDENCY_UNAVAILABLE");
    expect(serialized).not.toContain("sensitive database payload");
  });
});
