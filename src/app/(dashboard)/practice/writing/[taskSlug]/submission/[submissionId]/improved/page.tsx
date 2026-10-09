import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WritingImprovement } from "@/features/writing/components/writing-improvement";
import { getWritingImprovementReview } from "@/features/writing/server/content";

export const metadata: Metadata = { title: "Writing Improvement" };

export default async function WritingImprovementPage({
  params,
}: {
  params: Promise<{ taskSlug: string; submissionId: string }>;
}) {
  const { taskSlug, submissionId } = await params;
  const data = await getWritingImprovementReview(taskSlug, submissionId);
  if (!data) notFound();
  return <WritingImprovement data={data} />;
}
