"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/features/auth/action-state";
import { forgotPasswordAction } from "@/features/auth/actions";
import { Mail, MessageCircle, Smartphone } from "lucide-react";

type ForgotPasswordField = "identifier" | "channel";
const initialState: ActionState<ForgotPasswordField> = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 disabled:pointer-events-none disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Đang gửi OTP..." : "Nhận mã OTP"}
    </button>
  );
}

export function ForgotPasswordForm({ invalidLink = false }) {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  
  const [method, setMethod] = useState<"email" | "sms" | "whatsapp">("email");

  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  const identifierError = state.fieldErrors?.identifier?.[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
      <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Khôi phục mật khẩu
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Chọn phương thức nhận mã OTP để đặt lại mật khẩu của bạn.
          </p>
        </div>

        {invalidLink ? (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400"
          >
            Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.
          </p>
        ) : null}

        <form ref={formRef} action={formAction} noValidate>
          <input type="hidden" name="channel" value={method} />

          <div className="mb-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                method === "email"
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs font-medium">Email</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("sms")}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                method === "sms"
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              <Smartphone className="h-5 w-5" />
              <span className="text-xs font-medium">SMS</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("whatsapp")}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                method === "whatsapp"
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs font-medium">WhatsApp</span>
            </button>
          </div>

          {method === "email" ? (
            <>
              <div className="space-y-1">
                <label
                  htmlFor="recovery-identifier"
                  className="block text-sm font-medium text-gray-300"
                >
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <input
                    id="recovery-identifier"
                    name="identifier"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    required
                    maxLength={254}
                    aria-invalid={Boolean(identifierError)}
                    placeholder="ban@example.com"
                    className="block w-full rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {identifierError ? (
                  <p className="mt-2 text-sm text-red-400">{identifierError}</p>
                ) : null}
              </div>

              <div aria-live="polite" aria-atomic="true" className="mt-4">
                {state.message ? (
                  <p
                    role={state.status === "error" ? "alert" : "status"}
                    className={`rounded-xl p-4 text-center text-sm ${
                      state.status === "error"
                        ? "border border-red-500/20 bg-red-500/10 text-red-400"
                        : "border border-green-500/20 bg-green-500/10 text-green-400"
                    }`}
                  >
                    {state.message}
                  </p>
                ) : null}
              </div>

              <SubmitButton />
            </>
          ) : (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-6 text-center text-sm text-blue-400">
              Tính năng khôi phục qua {method === "sms" ? "SMS" : "WhatsApp"} hiện đang trong quá trình phát triển. Vui lòng quay lại sau hoặc sử dụng Email.
            </div>
          )}
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-indigo-400"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
