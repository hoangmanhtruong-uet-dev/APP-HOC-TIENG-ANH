import type { Metadata } from "next";

import {
  PlacementIntro,
  PlacementQuestions,
  PlacementResult,
} from "@/components/placement/placement-test";
import { requireCurrentAccount } from "@/server/auth/account";
import {
  getActivePlacementTest,
  getActivePlacementAttempt,
  getPlacementResult,
} from "@/server/placement/content";

export const metadata: Metadata = {
  title: "Kiểm tra trình độ đầu vào",
};

export default async function PlacementTestPage({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string; result?: string }>;
}) {
  await requireCurrentAccount();
  const params = await searchParams;

  if (params.result) {
    const result = await getPlacementResult(params.result);
    if (
      result?.status === "submitted" &&
      result.score !== null &&
      result.max_score !== null &&
      result.recommended_level
    ) {
      return (
        <main id="main-content">
          <PlacementResult
            score={result.score}
            maxScore={result.max_score}
            level={result.recommended_level}
          />
        </main>
      );
    }
  }

  const test = await getActivePlacementTest();
  const activeAttempt = await getActivePlacementAttempt(
    test.id,
    params.attempt,
  );
  if (activeAttempt) {
    return (
      <main id="main-content">
        <PlacementQuestions test={test} attempt={activeAttempt} />
      </main>
    );
  }

  return (
    <main id="main-content">
      <PlacementIntro />
    </main>
  );
}
