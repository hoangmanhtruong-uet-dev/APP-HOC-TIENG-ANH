import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WritingComplete } from "@/components/writing/writing-complete";
import {
  getWritingCatalog,
  getWritingSubmissionReview,
} from "@/server/writing/content";

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
