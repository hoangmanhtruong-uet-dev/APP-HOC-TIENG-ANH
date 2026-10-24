import type { Metadata } from "next";
import { Suspense } from "react";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { DictationClient } from "./client";

export const metadata: Metadata = {
  title: "Luyện nghe chép chính tả | Indigo Scholar",
  description:
    "Luyện kỹ năng nghe tiếng Anh qua bài tập chép chính tả. Nghe audio và gõ lại chính xác những gì bạn nghe được.",
};

export default async function DictationPage() {
  await requireCompletedOnboarding();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0E1D]" />}>
      <DictationClient />
    </Suspense>
  );
}
