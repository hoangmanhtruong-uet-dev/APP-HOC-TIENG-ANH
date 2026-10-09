import { describe, expect, it, vi } from "vitest";

import { getUserSubscriptionStatus } from "./subscription-guard";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from "@/lib/supabase/server";

describe("getUserSubscriptionStatus", () => {
  it("returns isPremium = false when user is unauthenticated", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({ data: { user: null } }),
      },
    } as any);

    const result = await getUserSubscriptionStatus();
    expect(result).toEqual({ isPremium: false, userId: null });
  });

  it("returns isPremium = true when user has active pro subscription", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: "user-123" } },
        }),
      },
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            in: vi.fn().mockReturnValueOnce({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { tier: "pro", status: "active" },
              }),
            }),
          }),
        }),
      }),
    } as any);

    const result = await getUserSubscriptionStatus();
    expect(result).toEqual({ isPremium: true, userId: "user-123" });
  });

  it("returns isPremium = false when user is free tier", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValueOnce({
          data: { user: { id: "user-456" } },
        }),
      },
      from: vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            in: vi.fn().mockReturnValueOnce({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { tier: "free", status: "active" },
              }),
            }),
          }),
        }),
      }),
    } as any);

    const result = await getUserSubscriptionStatus();
    expect(result).toEqual({ isPremium: false, userId: "user-456" });
  });
});
