"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { AuthSubmitButton } from "@/components/auth/submit-button";
import type { ActionState } from "@/features/auth/action-state";
import { forgotPasswordAction } from "@/features/auth/actions";

type ForgotPasswordField = "email";
const initialState: ActionState<ForgotPasswordField> = { status: "idle" };

export function ForgotPasswordForm({ invalidLink = false }) {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);
  const emailError = state.fieldErrors?.email?.[0];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      {invalidLink ? (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-[var(--warning-subtle)] p-3 text-sm text-[var(--warning)]"
        >
          Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết
          mới.
        </p>
      ) : null}
      <form ref={formRef} action={formAction} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label
            htmlFor="recovery-email"
            className="block text-sm font-semibold"
          >
            Email
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            required
            maxLength={254}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "recovery-email-error" : undefined}
            placeholder="ban@example.com…"
            className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
          {emailError ? (
            <p
              id="recovery-email-error"
              className="text-sm text-[var(--destructive)]"
            >
              {emailError}
            </p>
          ) : null}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className="rounded-lg bg-[var(--muted)] p-3 text-sm"
            >
              {state.message}
              {state.status === "error" && state.requestId ? (
                <span className="mt-1 block text-xs">
                  Mã yêu cầu: {state.requestId}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <AuthSubmitButton idleLabel="Gửi hướng dẫn" pendingLabel="Đang gửi…" />
      </form>
      <Link
        href="/login"
        className="mt-5 inline-flex min-h-11 items-center font-semibold text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
