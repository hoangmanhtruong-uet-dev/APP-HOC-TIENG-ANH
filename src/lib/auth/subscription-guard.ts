import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUserSubscriptionStatus(): Promise<{
  isPremium: boolean;
  userId: string | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isPremium: false, userId: null };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const isPremium = data?.tier === "pro";

  return {
    isPremium,
    userId: user.id,
  };
}
