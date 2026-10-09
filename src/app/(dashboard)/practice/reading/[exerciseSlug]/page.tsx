import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReadingRunner } from "@/features/reading/components/reading-runner";
import { ReadingStart } from "@/features/reading/components/reading-start";
import { parseMockRunnerContext } from "@/features/mock-tests/schemas";
import { getReadingPracticePage } from "@/features/reading/server/content";

export const metadata: Metadata = { title: "Luyện Reading" };

export default async function ReadingPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseSlug: string }>;
  searchParams: Promise<{
    error?: string;
    mockTestSlug?: string;
    mockSessionId?: string;
    mockSectionAttemptId?: string;
  }>;
}) {
  const [{ exerciseSlug }, query] = await Promise.all([params, searchParams]);
  const data = await getReadingPracticePage(exerciseSlug);
  if (!data) notFound();
  return data.attempt ? (
    <ReadingRunner data={data} mockContext={parseMockRunnerContext(query)} />
  ) : (
    <ReadingStart data={data} error={query.error} />
  );
}
