import type { Metadata } from "next";

import { ProgressAnalytics } from "@/components/analytics/progress-analytics";
import { getLearnerAnalytics } from "@/server/analytics/content";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Your progress",
  description: "Learning progress calculated from your saved activity.",
};

export default async function ProgressPage() {
  const [analytics, { learnerProfile }] = await Promise.all([
    getLearnerAnalytics(24),
    requireCompletedOnboarding(),
  ]);

  return (
    <ProgressAnalytics
      analytics={analytics}
      currentBand={learnerProfile.current_band}
    />
  );
}
