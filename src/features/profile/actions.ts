"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCurrentAccount } from "@/server/auth/account";
import { logServerEvent } from "@/server/observability/logger";
import { getServerRequestId } from "@/server/observability/request-context";
import type { ActionState } from "@/features/auth/action-state";
import { profileUpdateSchema } from "@/features/auth/schemas";

type ProfileField = "displayName";

export async function updateProfileAction(
  _previousState: ActionState<ProfileField>,
  formData: FormData,
): Promise<ActionState<ProfileField>> {
  const requestId = await getServerRequestId();
  const displayName = formData.get("displayName");
  const result = profileUpdateSchema.safeParse({
    displayName: typeof displayName === "string" ? displayName : "",
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại họ và tên.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  const account = await requireCurrentAccount();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: result.data.displayName })
    .eq("id", account.user.id);

  if (error) {
    logServerEvent("warn", {
      event: "profile.update.rejected",
      requestId,
      route: "updateProfileAction",
      stage: "update profile",
      errorCode: error.code ?? "PROFILE_UPDATE_REJECTED",
    });
    return {
      status: "error",
      message: "Không thể lưu hồ sơ lúc này. Hãy thử lại sau.",
      requestId,
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Hồ sơ đã được cập nhật.",
    requestId,
  };
}
