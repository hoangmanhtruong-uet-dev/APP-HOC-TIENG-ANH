import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Tạo hồ sơ để bắt đầu lộ trình tự học IELTS.",
};

export default function RegisterPage() {
  return (
    <div className="flex w-full items-center justify-center">
      <RegisterForm />
    </div>
  );
}
