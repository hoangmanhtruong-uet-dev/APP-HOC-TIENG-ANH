import type { Metadata } from "next";
import { Suspense } from "react";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { PlansClient, stageOf } from "./client";

export const metadata: Metadata = {
  title: "Lộ trình khóa học chi tiết | Indigo Scholar",
  description:
    "Kế hoạch học được thiết kế khoa học từng ngày, từng tuần. Tự động cá nhân hóa theo trình độ khởi điểm, thời gian rảnh và mục tiêu band điểm của bạn.",
};

export default async function PlansPage() {
  let initialBand = 2.0;
  let initialEnrolledId = 1;

  try {
    const { learnerProfile } = await requireCompletedOnboarding();
    if (learnerProfile?.current_band != null) {
      initialBand = Number(learnerProfile.current_band);
      initialEnrolledId = stageOf(initialBand) + 1;
    }
  } catch {
    // Fallback to defaults if running in isolated or test environment
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0C0E1D]" />}>
      <PlansClient
        initialBand={initialBand}
        initialEnrolledId={initialEnrolledId}
      />
    </Suspense>
  );
}
