import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCoursePlanBySlug } from "@/features/course-plans/content";
import { CoursePlanDetail } from "@/features/course-plans/components/course-plan-detail";

export const metadata: Metadata = {
  title: "Chi Tiết Lộ Trình Khóa Học",
};

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = getCoursePlanBySlug(slug);
  if (!plan) notFound();

  return <CoursePlanDetail plan={plan} />;
}
