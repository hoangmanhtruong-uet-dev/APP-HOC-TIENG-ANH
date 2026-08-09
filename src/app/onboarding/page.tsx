import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getAccountLabel } from "@/server/auth/account";
import { requirePendingOnboarding } from "@/server/onboarding/learner-profile";

export const metadata: Metadata = {
  title: "Thiết lập hồ sơ học tập",
  description:
    "Thiết lập mục tiêu, quỹ thời gian và ưu tiên học IELTS của bạn.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const requestedStep = (await searchParams).step === "2" ? 2 : undefined;
  const { account, learnerProfile } = await requirePendingOnboarding();

  return (
    <OnboardingWizard
      learnerProfile={learnerProfile}
      displayName={getAccountLabel(account)}
      initialStep={requestedStep}
    />
  );
}
