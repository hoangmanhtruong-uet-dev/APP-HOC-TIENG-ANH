import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListeningResult } from "@/features/listening/components/listening-result";
import { getListeningPracticeResult } from "@/features/listening/server/content";

export const metadata: Metadata = { title: "Listening result" };

export default async function ListeningResultPage({
  params,
}: {
  params: Promise<{ exerciseSlug: string; attemptId: string }>;
}) {
  const { exerciseSlug, attemptId } = await params;
  const data = await getListeningPracticeResult(exerciseSlug, attemptId);
  if (!data) notFound();
  return <ListeningResult data={data} />;
}
