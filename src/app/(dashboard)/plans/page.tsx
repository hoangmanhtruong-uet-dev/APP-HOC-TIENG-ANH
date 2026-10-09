import type { Metadata } from "next";
import { getCoursePlansCatalog } from "@/features/course-plans/content";
import { CoursePlansCatalog } from "@/features/course-plans/components/course-plans-catalog";

export const metadata: Metadata = {
  title: "Lộ Trình Khóa Học Chi Tiết - Indigo Scholar",
  description: "Khám phá các kế hoạch khóa học được thiết kế từng ngày chuẩn khảo thí quốc tế.",
};

export default function PlansPage() {
  const plans = getCoursePlansCatalog();
  return (
    <div className="mx-auto min-h-[100dvh] pb-32 font-sans">
      <CoursePlansCatalog plans={plans} />
    </div>
  );
}
