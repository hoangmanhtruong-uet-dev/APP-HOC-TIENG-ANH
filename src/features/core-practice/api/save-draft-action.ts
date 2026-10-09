"use server"

import { saveDraftRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SaveDraftSchema, type SaveDraftInput } from "../schema";

export async function saveExerciseDraftAction(input: SaveDraftInput) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Rate limit check
    const { success: rateLimitSuccess } = await saveDraftRateLimit.limit(`save_draft_${user.id}`);
    if (!rateLimitSuccess) {
      return { success: false, error: "Too many requests. Please slow down." };
    }

    // Validate input
    const parsed = SaveDraftSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid data format" };
    }

    const { attemptId, answers } = parsed.data;

    // Update draft in database
    const { error } = await supabase
      .from("exercise_attempts")
      .update({ 
        draft_answers: answers,
        updated_at: new Date().toISOString()
      })
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .eq("status", "in_progress");

    if (error) {
      console.error("Save draft error:", error);
      return { success: false, error: "Failed to save draft" };
    }

    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: "Internal server error" };
  }
}

// touched for audit
