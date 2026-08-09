import { z } from "@/lib/validation/zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const placementTestSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  version: z.number().int().positive(),
  questions: z.array(
    z.object({
      id: z.uuid(),
      position: z.number().int().positive(),
      skill: z.enum(["grammar", "vocabulary", "reading"]),
      prompt: z.string().min(1),
      options: z.array(optionSchema).min(2).max(6),
    }),
  ),
});

export type PlacementTest = z.infer<typeof placementTestSchema>;

const placementAttemptSchema = z.object({
  id: z.uuid(),
  status: z.literal("in_progress"),
  answers: z.record(z.string(), z.string()),
  current_position: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  updated_at: z.string(),
});

export type ActivePlacementAttempt = z.infer<typeof placementAttemptSchema>;

export async function getActivePlacementTest(): Promise<PlacementTest> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_active_placement_test", {
    p_slug: "english-foundation",
  });

  if (error) throw new Error("Không thể tải bài kiểm tra xếp lớp.");

  const parsed = placementTestSchema.safeParse(data);
  if (!parsed.success || parsed.data.questions.length === 0) {
    throw new Error("Bài kiểm tra xếp lớp chưa có nội dung đã xuất bản.");
  }
  return parsed.data;
}

export async function getPlacementResult(attemptId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("placement_attempts")
    .select("id, status, score, max_score, recommended_level, submitted_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (error) throw new Error("Không thể tải kết quả kiểm tra xếp lớp.");
  return data;
}

export async function getActivePlacementAttempt(
  placementTestId: string,
  attemptId?: string,
): Promise<ActivePlacementAttempt | null> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = () =>
    supabase
      .from("placement_attempts")
      .select("id, status, answers, current_position, revision, updated_at")
      .eq("placement_test_id", placementTestId)
      .eq("status", "in_progress");

  const readAttempt = (requestedId?: string) => {
    let query = baseQuery();
    if (requestedId) query = query.eq("id", requestedId);
    return query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
  };

  let { data, error } = await readAttempt(attemptId);
  if (!error && !data && attemptId) {
    ({ data, error } = await readAttempt());
  }
  if (error) throw new Error("Không thể tải tiến trình bài kiểm tra xếp lớp.");
  if (!data) return null;
  const parsed = placementAttemptSchema.safeParse(data);
  if (!parsed.success) throw new Error("Tiến trình bài kiểm tra không hợp lệ.");
  return parsed.data;
}
