import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PronunciationPractice } from "@/components/speaking/pronunciation-practice";
import { getSpeakingAttemptReview } from "@/server/speaking/content";

export const metadata: Metadata = { title: "Pronunciation Practice" };

export default async function PronunciationPracticePage({
  params,
}: {
  params: Promise<{ setSlug: string; attemptId: string }>;
}) {
  const { setSlug, attemptId } = await params;
  const data = await getSpeakingAttemptReview(setSlug, attemptId);
  if (!data) notFound();
  return <PronunciationPractice data={data} />;
}
