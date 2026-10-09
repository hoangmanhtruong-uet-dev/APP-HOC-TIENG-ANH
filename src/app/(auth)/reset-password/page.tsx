import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
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
    <div className="flex w-full items-center justify-center">
      {validRecoverySession ? (
        <ResetPasswordForm />
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10 text-center max-w-md w-full">
          <div className="mb-4 text-red-400">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Liên kết không hợp lệ</h2>
          <p className="mb-6 text-sm text-gray-400">Liên kết khôi phục không hợp lệ hoặc đã hết hạn.</p>
          <Link
            href="/forgot-password"
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40"
          >
            Yêu cầu liên kết mới
          </Link>
        </div>
      )}
    </div>
  );
}
