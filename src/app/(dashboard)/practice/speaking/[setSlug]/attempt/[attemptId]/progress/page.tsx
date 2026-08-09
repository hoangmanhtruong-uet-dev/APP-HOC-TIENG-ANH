import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpeakingImprovement } from "@/components/speaking/speaking-improvement";
import { getSpeakingImprovementReview } from "@/server/speaking/content";

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
