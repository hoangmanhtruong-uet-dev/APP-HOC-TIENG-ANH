"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Key, Eye, EyeOff } from "lucide-react";

import type { ActionState } from "@/features/auth/action-state";
import { resetPasswordAction } from "@/features/auth/actions";

type ResetPasswordField = "password" | "confirmPassword";
const initialState: ActionState<ResetPasswordField> = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 disabled:pointer-events-none disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10 max-w-md w-full text-center">
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-green-500/20 blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Thành công!</h2>
          <p className="mb-8 text-gray-400">{state.message}</p>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  const passwordError = state.fieldErrors?.password?.[0];
  const confirmError = state.fieldErrors?.confirmPassword?.[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10 max-w-md w-full">
      <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Key className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Đặt lại mật khẩu
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Chọn mật khẩu mới có ít nhất 8 ký tự.
          </p>
        </div>

        <form ref={formRef} action={formAction} noValidate>
          <div className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="reset-password"
                className="block text-sm font-medium text-gray-300"
              >
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(passwordError)}
                  className="block w-full rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError ? (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="reset-confirm-password"
                className="block text-sm font-medium text-gray-300"
              >
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(confirmError)}
                  className="block w-full rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmError ? (
                <p className="mt-2 text-sm text-red-400">{confirmError}</p>
              ) : null}
            </div>
          </div>

          <div aria-live="polite" aria-atomic="true" className="mt-4">
            {state.message && state.status === "error" ? (
              <p
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400"
              >
                {state.message}
                {state.requestId ? (
                  <span className="mt-1 block text-xs opacity-80">
                    Mã yêu cầu: {state.requestId}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
