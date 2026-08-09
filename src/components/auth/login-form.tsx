"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthSubmitButton } from "@/components/auth/submit-button";
import type { ActionState } from "@/features/auth/action-state";
import { loginAction } from "@/features/auth/actions";

type LoginField = "email" | "password";
const initialState: ActionState<LoginField> = { status: "idle" };

export function LoginForm({
  next,
  initialMessage,
}: {
  next?: string;
  initialMessage?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    firstInvalid?.focus();
  }, [state]);

  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_24px_70px_rgb(var(--shadow-color)/0.1)] sm:p-8">
      {initialMessage ? (
        <p className="mb-5 rounded-lg bg-[var(--warning-subtle)] p-3 text-sm leading-6 text-[var(--warning)]">
          {initialMessage}
        </p>
      ) : null}
      <form ref={formRef} action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="block text-sm font-semibold text-[var(--foreground)]"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            inputMode="email"
            maxLength={254}
            required
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "login-email-error" : undefined}
            placeholder="ban@example.com…"
            className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          />
          {emailError ? (
            <p
              id="login-email-error"
              className="text-sm text-[var(--destructive)]"
            >
              {emailError}
            </p>
          ) : null}
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          label="Mật khẩu"
          autoComplete="current-password"
          error={passwordError}
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className="rounded-lg bg-[var(--destructive-subtle)] p-3 text-sm leading-6 text-[var(--destructive)]"
            >
              {state.message}
              {state.requestId ? (
                <span
                  data-testid="request-id"
                  className="mt-1 block text-xs font-medium"
                >
                  Mã yêu cầu: {state.requestId}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <AuthSubmitButton
          idleLabel="Đăng nhập"
          pendingLabel="Đang đăng nhập…"
        />
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
