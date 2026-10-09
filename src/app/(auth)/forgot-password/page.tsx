import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Khôi phục mật khẩu",
  description: "Yêu cầu liên kết đặt lại mật khẩu.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recoveryError?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex w-full items-center justify-center">
      <ForgotPasswordForm
        invalidLink={params.recoveryError === "invalid_or_expired"}
      />
    </div>
  );
}
