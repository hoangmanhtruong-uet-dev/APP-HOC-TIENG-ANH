"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/features/auth/action-state";
import { loginAction } from "@/features/auth/actions";
import { SocialAuthButtons } from "./social-auth-buttons";

import styles from "./login-form.module.css";

type LoginField = "email" | "password";
const initialState: ActionState<LoginField> = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.sign} disabled={pending}>
      {pending ? "Đang đăng nhập..." : "Sign in"}
    </button>
  );
}

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
    <div className={styles.formContainer}>
      <p className={styles.title}>Login</p>

      {initialMessage ? (
        <p style={{ marginTop: '1rem', color: '#fbbf24', fontSize: '0.875rem', textAlign: 'center' }}>
          {initialMessage}
        </p>
      ) : null}

      <form ref={formRef} action={formAction} className={styles.form} noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        
        <div className={styles.inputGroup}>
          <label htmlFor="login-email">Email</label>
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
            placeholder=""
          />
          {emailError ? (
            <p id="login-email-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
              {emailError}
            </p>
          ) : null}
        </div>

        <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={72}
            required
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "login-password-error" : undefined}
            placeholder=""
          />
          {passwordError ? (
            <p id="login-password-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
              {passwordError}
            </p>
          ) : null}
          <div className={styles.forgot}>
            <Link href="/forgot-password">Forgot Password ?</Link>
          </div>
        </div>

        <div aria-live="polite" aria-atomic="true" style={{ marginBottom: '1rem' }}>
          {state.message ? (
            <p
              role={state.status === "error" ? "alert" : "status"}
              style={{ color: state.status === "error" ? '#ef4444' : '#10b981', fontSize: '0.875rem' }}
            >
              {state.message}
              {state.requestId ? (
                <span className="mt-1 block text-xs font-medium" style={{ opacity: 0.8 }}>
                  Mã yêu cầu: {state.requestId}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <SubmitButton />
      </form>

      <div className={styles.socialMessage}>
        <div className={styles.line}></div>
        <p className={styles.message}>Login with social accounts</p>
        <div className={styles.line}></div>
      </div>

      <SocialAuthButtons styles={styles} />

      <p style={{ marginTop: '1rem', fontSize: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>
        Bằng việc đăng nhập, bạn đồng ý với <Link href="/terms" className="underline hover:text-indigo-400">Điều khoản dịch vụ</Link> và <Link href="/privacy" className="underline hover:text-indigo-400">Chính sách bảo mật</Link> của chúng tôi.
      </p>

      <p className={styles.signup}>
        Don't have an account? <Link href="/register">Sign up</Link>
      </p>
    </div>
  );
}
