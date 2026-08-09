import { afterEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.fn();
const getUser = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { resetPasswordForEmail, getUser, updateUser, signOut },
  })),
}));

import {
  forgotPasswordAction,
  resetPasswordAction,
} from "@/features/auth/actions";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("password recovery actions", () => {
  it("returns the same generic success when the provider rejects the request", async () => {
    const output = vi.spyOn(console, "warn").mockImplementation(() => {});
    resetPasswordForEmail.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });
    const formData = new FormData();
    formData.set("email", "learner@example.com");

    const state = await forgotPasswordAction({ status: "idle" }, formData);
    const serializedLog = String(output.mock.calls[0]?.[0]);

    expect(state.status).toBe("success");
    expect(state.message).toContain("Nếu tài khoản tồn tại");
    expect(serializedLog).not.toContain("learner@example.com");
  });

  it("reports an expired recovery session without attempting an update", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const formData = new FormData();
    formData.set("password", "new-password");
    formData.set("confirmPassword", "new-password");

    const state = await resetPasswordAction({ status: "idle" }, formData);

    expect(state.status).toBe("error");
    expect(state.message).toContain("không hợp lệ hoặc đã hết hạn");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and signs out the recovery session", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    updateUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    const formData = new FormData();
    formData.set("password", "new-password");
    formData.set("confirmPassword", "new-password");

    const state = await resetPasswordAction({ status: "idle" }, formData);

    expect(state.status).toBe("success");
    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
