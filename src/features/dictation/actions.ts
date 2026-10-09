"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startDictationSchema, submitDictationSchema } from "./schemas";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";

export async function startDictationAction(formData: FormData) {
  const parsed = startDictationSchema.safeParse({
    exerciseSlug: formData.get("exerciseSlug"),
  });
  if (!parsed.success) redirect("/practice/listening/dictation?error=invalid");

  await requireCompletedOnboarding();
  revalidatePath("/practice/listening/dictation");
  redirect(`/practice/listening/dictation/${parsed.data.exerciseSlug}`);
}

export async function submitDictationAction(input: any) {
  const parsed = submitDictationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error" as const, message: "Dữ liệu nộp bài không hợp lệ." };
  }
  await requireCompletedOnboarding();
  revalidatePath("/practice/listening/dictation");
  revalidatePath(`/practice/listening/dictation/${parsed.data.exerciseSlug}`);
  return { status: "success" as const, exerciseSlug: parsed.data.exerciseSlug };
}
