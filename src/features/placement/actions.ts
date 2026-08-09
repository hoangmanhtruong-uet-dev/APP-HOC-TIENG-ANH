"use server";

import { redirect } from "next/navigation";
import { z } from "@/lib/validation/zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActivePlacementTest } from "@/server/placement/content";
import { logServerEvent } from "@/server/observability/logger";
import { getServerRequestId } from "@/server/observability/request-context";

export type PlacementActionState = {
  status: "idle" | "error";
  message?: string;
  requestId?: string;
};

export type PlacementSaveResult =
  | { status: "saved"; revision: number; currentPosition: number }
  | { status: "conflict" | "error"; message: string; requestId?: string };

const attemptIdSchema = z.uuid();
const savePlacementSchema = z.object({
  attemptId: z.uuid(),
  questionId: z.uuid(),
  optionId: z.string().min(1).max(100),
  currentPosition: z.number().int().positive(),
  expectedRevision: z.number().int().nonnegative(),
});

export async function savePlacementAnswerAction(
  input: z.infer<typeof savePlacementSchema>,
): Promise<PlacementSaveResult> {
  const requestId = await getServerRequestId();
  const parsed = savePlacementSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Câu trả lời không hợp lệ.", requestId };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_placement_answer", {
    p_attempt_id: parsed.data.attemptId,
    p_question_id: parsed.data.questionId,
    p_option_id: parsed.data.optionId,
    p_current_position: parsed.data.currentPosition,
    p_expected_revision: parsed.data.expectedRevision,
  });
  if (error) {
    return {
      status:
        error.code === "PT409" || error.code === "40001" ? "conflict" : "error",
      message:
        error.code === "PT409" || error.code === "40001"
          ? "Tiến trình đã thay đổi ở tab khác. Hãy tải lại để tiếp tục."
          : "Lưu thất bại — hãy thử lại.",
      requestId,
    };
  }
  return {
    status: "saved",
    revision: data.revision,
    currentPosition: data.current_position,
  };
}

export async function updatePlacementPositionAction(input: {
  attemptId: string;
  currentPosition: number;
  expectedRevision: number;
}): Promise<PlacementSaveResult> {
  const requestId = await getServerRequestId();
  const parsed = z
    .object({
      attemptId: z.uuid(),
      currentPosition: z.number().int().positive(),
      expectedRevision: z.number().int().nonnegative(),
    })
    .safeParse(input);
  if (!parsed.success)
    return { status: "error", message: "Vị trí không hợp lệ.", requestId };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_placement_position", {
    p_attempt_id: parsed.data.attemptId,
    p_current_position: parsed.data.currentPosition,
    p_expected_revision: parsed.data.expectedRevision,
  });
  if (error)
    return {
      status:
        error.code === "PT409" || error.code === "40001" ? "conflict" : "error",
      message:
        error.code === "PT409" || error.code === "40001"
          ? "Tiến trình đã thay đổi ở tab khác. Hãy tải lại để tiếp tục."
          : "Lưu vị trí thất bại — hãy thử lại.",
      requestId,
    };
  return {
    status: "saved",
    revision: data.revision,
    currentPosition: data.current_position,
  };
}

export async function startPlacementAction(
  _previousState: PlacementActionState,
  _formData: FormData,
): Promise<PlacementActionState> {
  void _previousState;
  void _formData;
  const requestId = await getServerRequestId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_placement_attempt", {
    p_slug: "english-foundation",
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error) {
    logServerEvent("warn", {
      event: "placement.start.rejected",
      requestId,
      route: "startPlacementAction",
      stage: "start placement attempt",
      errorCode: error.code ?? "PLACEMENT_START_REJECTED",
    });
    return {
      status: "error",
      message: "Không thể bắt đầu bài kiểm tra lúc này.",
      requestId,
    };
  }

  redirect(`/placement-test?attempt=${data.id}`);
}

export async function submitPlacementAction(
  _previousState: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const requestId = await getServerRequestId();
  const attemptIdResult = attemptIdSchema.safeParse(formData.get("attemptId"));
  const idempotencyKeyResult = z
    .uuid()
    .safeParse(formData.get("idempotencyKey"));
  if (!attemptIdResult.success) {
    return {
      status: "error",
      message: "Lượt kiểm tra không hợp lệ.",
      requestId,
    };
  }
  if (!idempotencyKeyResult.success) {
    return {
      status: "error",
      message: "Yêu cầu hoàn tất không hợp lệ.",
      requestId,
    };
  }

  const test = await getActivePlacementTest();
  const answers: Record<string, string> = {};
  for (const question of test.questions) {
    const answer = formData.get(`answer:${question.id}`);
    if (
      typeof answer !== "string" ||
      !question.options.some((option) => option.id === answer)
    ) {
      return {
        status: "error",
        message: "Hãy trả lời đầy đủ tất cả câu hỏi.",
        requestId,
      };
    }
    answers[question.id] = answer;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_placement_attempt", {
    p_attempt_id: attemptIdResult.data,
    p_answers: answers,
    p_idempotency_key: idempotencyKeyResult.data,
  });

  if (error) {
    logServerEvent("warn", {
      event: "placement.submit.rejected",
      requestId,
      route: "submitPlacementAction",
      stage: "score placement attempt",
      errorCode: error.code ?? "PLACEMENT_SUBMIT_REJECTED",
    });
    return {
      status: "error",
      message: "Không thể chấm bài kiểm tra lúc này.",
      requestId,
    };
  }

  redirect(`/placement-test?result=${data.id}`);
}
