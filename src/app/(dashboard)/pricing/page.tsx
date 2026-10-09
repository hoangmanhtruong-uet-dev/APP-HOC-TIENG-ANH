import type { Metadata } from "next";
import { PricingTable } from "@/features/billing/components/pricing-table";

export const metadata: Metadata = {
  title: "Đầu tư cho mục tiêu IELTS của bạn - Indigo Scholar",
  description: "Lựa chọn lộ trình học tập thông minh với AI để bứt phá band điểm.",
};

export default function PricingPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
       <PricingTable />
    </div>
  );
}
