import type { Metadata } from "next";

import { WritingHubClient } from "./client";
import {
  getWritingCatalog,
  getRecentWritingSubmissions,
} from "@/features/writing/server/content";
import { getCurrentLearnerProfile } from "@/features/onboarding/server/learner-profile";

export const metadata: Metadata = {
  title: "Zen Focus Writing Studio & Lexical Architecture | Indigo Scholar",
  description:
    "Trung tâm luyện viết IELTS Task 1 & Task 2 chuẩn học thuật Cambridge, bộ đếm từ vựng thời gian thực, ma trận liên từ Cohesion và Zen Focus Studio từ Band 5.0 đến 9.0.",
};

export default async function WritingCatalogPage() {
  const [items, submissions, profile] = await Promise.all([
    getWritingCatalog().catch(() => []),
    getRecentWritingSubmissions(24).catch(() => []),
    getCurrentLearnerProfile().catch(() => null),
  ]);

  return (
    <WritingHubClient
      items={items}
      submissionsCount={submissions.length}
      avgScore={7.0}
      profile={
        profile
          ? {
              current_band: profile.current_band,
              target_band: profile.target_band,
              daily_study_minutes: profile.daily_study_minutes,
              target_exam_date: profile.target_exam_date,
            }
          : null
      }
    />
  );
}
