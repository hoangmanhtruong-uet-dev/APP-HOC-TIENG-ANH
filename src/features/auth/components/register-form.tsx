"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/features/auth/action-state";
import { registerAction } from "@/features/auth/actions";
import { SocialAuthButtons } from "./social-auth-buttons";

import styles from "./register-form.module.css";

type RegisterField =
  | "displayName"
  | "email"
  | "password"
  | "confirmPassword"
  | "acceptPolicies";

const initialState: ActionState<RegisterField> = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.submit} disabled={pending}>
      {pending ? "Đang xử lý..." : "Submit"}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    firstInvalid?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        className="rounded-2xl border border-[var(--success-soft)] bg-[var(--success-subtle)] p-6 sm:p-8"
        role="status"
      >
        <CircleCheck
          aria-hidden="true"
          className="text-[var(--success)]"
          size={28}
          strokeWidth={1.8}
        />
        <h2 className="mt-5 text-xl font-bold text-[var(--foreground)]">
          Kiểm tra hộp thư của bạn
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--success)]">
          {state.message}
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Tới trang đăng nhập</Link>
        </Button>
      </div>
    );
  }

  const displayNameError = state.fieldErrors?.displayName?.[0];
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];
  const confirmPasswordError = state.fieldErrors?.confirmPassword?.[0];
  const policiesError = state.fieldErrors?.acceptPolicies?.[0];

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      <p className={styles.title}>Register</p>
      <p className={styles.message}>Signup now and get full access to our app.</p>

      <label className={styles.inputContainer}>
        <input
          name="displayName"
          className={styles.input}
          type="text"
          placeholder=""
          required
          aria-invalid={Boolean(displayNameError)}
        />
        <span>Họ và tên</span>
        {displayNameError && (
          <span className={styles.errorText}>{displayNameError}</span>
        )}
      </label>

      <label className={styles.inputContainer}>
        <input
          name="email"
          className={styles.input}
          type="email"
          placeholder=""
          required
          aria-invalid={Boolean(emailError)}
        />
        <span>Email</span>
        {emailError && (
          <span className={styles.errorText}>{emailError}</span>
        )}
      </label>

      <label className={styles.inputContainer}>
        <input
          name="password"
          className={styles.input}
          type="password"
          placeholder=""
          required
          aria-invalid={Boolean(passwordError)}
        />
        <span>Password</span>
        {passwordError && (
          <span className={styles.errorText}>{passwordError}</span>
        )}
      </label>

      <label className={styles.inputContainer}>
        <input
          name="confirmPassword"
          className={styles.input}
          type="password"
          placeholder=""
          required
          aria-invalid={Boolean(confirmPasswordError)}
        />
        <span>Confirm password</span>
        {confirmPasswordError && (
          <span className={styles.errorText}>{confirmPasswordError}</span>
        )}
      </label>

      <label className={styles.checkboxContainer}>
        <input
          name="acceptPolicies"
          type="checkbox"
          required
          aria-invalid={Boolean(policiesError)}
        />
        <span>
          Tôi đã đọc và đồng ý với <Link href="/terms">Điều khoản sử dụng</Link> và{" "}
          <Link href="/privacy">Chính sách quyền riêng tư</Link>.
        </span>
      </label>
      {policiesError && (
        <span className={styles.errorText} style={{ marginTop: "-10px" }}>
          {policiesError}
        </span>
      )}

      {state.message && state.status === "error" && (
        <p className={styles.errorText} style={{ textAlign: "center" }}>
          {state.message}
        </p>
      )}

      <SubmitButton />

      <div className={styles.socialMessage}>
        <div className={styles.line}></div>
        <p className={styles.message}>Signup with social accounts</p>
        <div className={styles.line}></div>
      </div>

      <SocialAuthButtons styles={styles} />

      <p className={styles.signin}>
        Already have an account? <Link href="/login">Signin</Link>
      </p>
    </form>
  );
}
