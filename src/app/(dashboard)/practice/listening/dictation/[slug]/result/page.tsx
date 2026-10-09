import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictationBySlug } from "@/features/dictation/content";
import { DictationResult } from "@/features/dictation/components/dictation-result";

export const metadata: Metadata = {
  title: "Kết quả Dictation",
};

export default async function DictationResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getDictationBySlug(slug);
  if (!exercise) notFound();

  return <DictationResult exercise={exercise} />;
}
