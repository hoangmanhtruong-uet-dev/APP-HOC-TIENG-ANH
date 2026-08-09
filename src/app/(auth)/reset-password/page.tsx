import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  description: "Đặt mật khẩu mới từ liên kết khôi phục hợp lệ.",
};

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const validRecoverySession = !error && Boolean(data.user);

  return (
    <div>
      <h1 className="text-3xl font-bold text-pretty">Đặt lại mật khẩu</h1>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
        Chọn mật khẩu mới có ít nhất 8 ký tự.
      </p>
      <div className="mt-8">
        {validRecoverySession ? (
          <ResetPasswordForm />
        ) : (
          <div
            role="alert"
            className="rounded-2xl border border-[var(--warning-soft)] bg-[var(--warning-subtle)] p-6"
          >
            <p>Liên kết khôi phục không hợp lệ hoặc đã hết hạn.</p>
            <Link
              href="/forgot-password"
              className="mt-5 inline-flex min-h-11 items-center font-semibold text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              Yêu cầu liên kết mới
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
