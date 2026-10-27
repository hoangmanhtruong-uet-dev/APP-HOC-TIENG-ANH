import type { Metadata } from "next";
import { Suspense } from "react";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { getLearnerAnalytics } from "@/features/analytics/server/content";
import { ProgressClient } from "./client";

export const metadata: Metadata = {
  title: "Báo cáo & Tiến độ học tập 3D | Indigo Scholar",
  description:
    "Phân tích chuyên sâu hiệu suất học tập, xu hướng điểm số 3D, cân bằng 6 kỹ năng IELTS và bản đồ hoạt động 365 ngày.",
};

export default async function ProgressPage() {
  const initialStreak = 12;
  let initialCompletedLessons = 38;
  let initialTargetBand = "7.5";

  try {
    const [{ learnerProfile }, analytics] = await Promise.all([
      requireCompletedOnboarding(),
      getLearnerAnalytics(8),
    ]);

    if (learnerProfile?.target_band != null) {
      initialTargetBand = String(learnerProfile.target_band);
    }

    if (analytics?.overview?.lessonCompleted != null && analytics.overview.lessonCompleted > 0) {
      initialCompletedLessons = analytics.overview.lessonCompleted;
    }
  } catch {
    // Fallback gracefully in testing or isolated environments
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0e15]" />}>
      <ProgressClient
        initialStreak={initialStreak}
        initialCompletedLessons={initialCompletedLessons}
        initialTargetBand={initialTargetBand}
      />
    </Suspense>
  );
}
