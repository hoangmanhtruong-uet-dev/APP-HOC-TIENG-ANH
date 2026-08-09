"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/validation/zod";

import { learningSlugSchema } from "@/features/learning/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompletedOnboarding } from "@/server/onboarding/learner-profile";

const vocabularyReviewSchema = z.object({
  vocabularyEntryId: z.uuid(),
  familiarity: z.enum(["again", "learning", "mastered"]),
  currentSlug: learningSlugSchema,
  nextSlug: learningSlugSchema,
});

export async function recordVocabularyReviewAction(formData: FormData) {
  const parsed = vocabularyReviewSchema.safeParse({
    vocabularyEntryId: formData.get("vocabularyEntryId"),
    familiarity: formData.get("familiarity"),
    currentSlug: formData.get("currentSlug"),
    nextSlug: formData.get("nextSlug"),
  });
  if (!parsed.success) redirect("/learn/vocabulary?error=invalid-review");

  await requireCompletedOnboarding();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_vocabulary_review", {
    p_vocabulary_entry_id: parsed.data.vocabularyEntryId,
    p_familiarity: parsed.data.familiarity,
  });
  if (error)
    redirect(`/learn/vocabulary/${parsed.data.currentSlug}?error=save`);

  revalidatePath("/learn/vocabulary");
  const destination =
    parsed.data.familiarity === "again"
      ? parsed.data.currentSlug
      : parsed.data.nextSlug;
  redirect(`/learn/vocabulary/${destination}?saved=1`);
}
