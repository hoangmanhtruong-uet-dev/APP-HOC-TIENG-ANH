import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WritingComplete } from "@/features/writing/components/writing-complete";
import {
  getWritingCatalog,
  getWritingSubmissionReview,
} from "@/features/writing/server/content";

export const metadata: Metadata = { title: "Writing Practice Complete" };

export default async function WritingCompletePage({
  params,
}: {
  params: Promise<{ taskSlug: string; submissionId: string }>;
}) {
  const { taskSlug, submissionId } = await params;
  const [data, catalog] = await Promise.all([
    getWritingSubmissionReview(taskSlug, submissionId),
    getWritingCatalog(),
  ]);
  if (!data) notFound();
  const nextTask = catalog.find((task) => task.slug !== taskSlug) ?? null;
  return <WritingComplete data={data} nextTask={nextTask} />;
}
