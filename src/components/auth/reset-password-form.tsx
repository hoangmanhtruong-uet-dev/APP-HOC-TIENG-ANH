"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthSubmitButton } from "@/components/auth/submit-button";
import type { ActionState } from "@/features/auth/action-state";
import { resetPasswordAction } from "@/features/auth/actions";

type ResetPasswordField = "password" | "confirmPassword";
const initialState: ActionState<ResetPasswordField> = { status: "idle" };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[var(--success-soft)] bg-[var(--success-subtle)] p-6"
      >
        <p className="font-semibold text-[var(--success)]">{state.message}</p>
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-11 items-center font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"
      noValidate
    >
      <PasswordInput
        id="reset-password"
        name="password"
        label="Mật khẩu mới"
        autoComplete="new-password"
        error={state.fieldErrors?.password?.[0]}
        minLength={8}
      />
      <PasswordInput
        id="reset-confirm-password"
        name="confirmPassword"
        label="Xác nhận mật khẩu mới"
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword?.[0]}
        minLength={8}
      />
      <div aria-live="polite" aria-atomic="true">
        {state.message ? (
          <p
            role="alert"
            className="rounded-lg bg-[var(--destructive-subtle)] p-3 text-sm text-[var(--destructive)]"
          >
            {state.message}
            {state.requestId ? (
              <span className="mt-1 block text-xs">
                Mã yêu cầu: {state.requestId}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <AuthSubmitButton
        idleLabel="Cập nhật mật khẩu"
        pendingLabel="Đang cập nhật…"
      />
    </form>
  );
}
