import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MockTestSummary } from "@/features/mock-tests/components/mock-test-summary";
import { getMockSessionPage } from "@/features/mock-tests/server/content";

export const metadata: Metadata = { title: "Tổng kết mock test" };

export default async function MockTestSummaryPage({
  params,
}: {
  params: Promise<{ mockTestSlug: string; sessionId: string }>;
}) {
  const { mockTestSlug, sessionId } = await params;
  const data = await getMockSessionPage(mockTestSlug, sessionId);
  if (!data) notFound();
  if (data.session.status !== "completed" || !data.result) {
    redirect(`/mock-tests/${mockTestSlug}/session/${sessionId}`);
  }
  return <MockTestSummary data={data} />;
}
