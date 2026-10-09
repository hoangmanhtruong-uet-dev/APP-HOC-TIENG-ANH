import type { Metadata } from "next";
import { VerifyOtpForm } from "@/features/auth/components/verify-otp-form";

export const metadata: Metadata = {
  title: "Xác thực mã OTP",
  description: "Nhập mã OTP để hoàn tất.",
};

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const target = params.target || "email/sđt của bạn";
  const channel = params.channel || "email";

  return (
    <div className="flex w-full items-center justify-center">
      <VerifyOtpForm identifier={target} channel={channel} />
    </div>
  );
}
