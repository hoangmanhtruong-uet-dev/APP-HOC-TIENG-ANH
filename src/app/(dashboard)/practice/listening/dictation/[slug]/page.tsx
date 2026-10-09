import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictationBySlug } from "@/features/dictation/content";
import { DictationRunner } from "@/features/dictation/components/dictation-runner";

export const metadata: Metadata = {
  title: "Luyện Chép Chính Tả - Dictation",
};

export default async function DictationExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getDictationBySlug(slug);
  if (!exercise) notFound();

  return <DictationRunner exercise={exercise} />;
}
