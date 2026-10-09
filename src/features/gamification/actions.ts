"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function buyStreakFreezeAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: gamification } = await supabase
    .from("user_gamification")
    .select("total_xp, streak_freezes_available")
    .eq("user_id", user.id)
    .single();

  if (!gamification || gamification.total_xp < 500) {
    return { success: false, error: "Không đủ XP để đổi Streak Freeze (Cần 500 XP)" };
  }

  // Deduct 500 XP and add 1 freeze
  const { error } = await supabase
    .from("user_gamification")
    .update({
      total_xp: gamification.total_xp - 500,
      streak_freezes_available: gamification.streak_freezes_available + 1,
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Có lỗi xảy ra khi đổi" };
  }

  // Log event
  await supabase.from("xp_events").insert({
    user_id: user.id,
    amount: -500,
    source: "buy_streak_freeze",
  });

  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}
