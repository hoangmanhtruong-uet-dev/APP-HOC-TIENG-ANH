import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";
import { getConfirmationMessage } from "@/features/auth/errors";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào không gian tự học IELTS.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; authError?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex w-full items-center justify-center">
      <LoginForm
        next={params.next}
        initialMessage={getConfirmationMessage(params.authError)}
      />
    </div>
  );
}
