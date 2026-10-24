import type { Metadata } from "next";
import { Suspense } from "react";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { RoadmapClient } from "./client";

export const metadata: Metadata = {
  title: "Bản đồ lộ trình cá nhân hóa | Indigo Scholar",
  description:
    "Bản đồ lộ trình cá nhân hóa, 3D WebGL cây kiến thức IELTS, và AI Pacing Assistant theo thời gian thực.",
};

export default async function RoadmapPage() {
  let targetBand = "6.5";
  let currentBand = "4.0";
  let targetExamDate = "2026-12-15";
  let initialDailyMinutes = 35;

  try {
    const { learnerProfile } = await requireCompletedOnboarding();
    if (learnerProfile) {
      if (learnerProfile.target_band != null) {
        targetBand = String(learnerProfile.target_band);
      }
      if (learnerProfile.current_band != null) {
        currentBand = String(learnerProfile.current_band);
      }
      if (learnerProfile.target_exam_date) {
        targetExamDate = String(learnerProfile.target_exam_date);
      }
      if (learnerProfile.daily_study_minutes) {
        initialDailyMinutes = Number(learnerProfile.daily_study_minutes);
      }
    }
  } catch {
    // Fallback gracefully if running in isolated or test environment
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0d14]" />}>
      <RoadmapClient
        targetBand={targetBand}
        currentBand={currentBand}
        targetExamDate={targetExamDate}
        initialDailyMinutes={initialDailyMinutes}
      />
    </Suspense>
  );
}
