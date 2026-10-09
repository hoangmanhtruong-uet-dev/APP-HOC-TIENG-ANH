import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpeakingImprovement } from "@/features/speaking/components/speaking-improvement";
import { getSpeakingImprovementReview } from "@/features/speaking/server/content";

export const metadata: Metadata = { title: "Speaking Improvement" };

export default async function SpeakingImprovementPage({
  params,
}: {
  params: Promise<{ setSlug: string; attemptId: string }>;
}) {
  const { setSlug, attemptId } = await params;
  const data = await getSpeakingImprovementReview(setSlug, attemptId);
  if (!data) notFound();
  return <SpeakingImprovement data={data} />;
}
