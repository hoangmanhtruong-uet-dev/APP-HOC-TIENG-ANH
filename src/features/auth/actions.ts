"use server";

import { redirect } from "next/navigation";

import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/server/observability/logger";
import { getServerRequestId } from "@/server/observability/request-context";

import type { ActionState } from "./action-state";
import { mapAuthError } from "./errors";
import { PRIVACY_VERSION, TERMS_VERSION } from "./policies";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";
import { siteConfig } from "@/config/site";

type LoginField = "email" | "password";
type RegisterField =
  "displayName" | "email" | "password" | "confirmPassword" | "acceptPolicies";
type ForgotPasswordField = "email";
type ResetPasswordField = "password" | "confirmPassword";

function valueOf(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerAction(
  _previousState: ActionState<RegisterField>,
  formData: FormData,
): Promise<ActionState<RegisterField>> {
  const requestId = await getServerRequestId();
  const result = registerSchema.safeParse({
    displayName: valueOf(formData, "displayName"),
    email: valueOf(formData, "email"),
    password: valueOf(formData, "password"),
    confirmPassword: valueOf(formData, "confirmPassword"),
    acceptPolicies: valueOf(formData, "acceptPolicies"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          display_name: result.data.displayName,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          policies_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      logServerEvent("warn", {
        event: "auth.register.rejected",
        requestId,
        route: "registerAction",
        stage: "supabase sign up",
        errorCode: error.code ?? "AUTH_PROVIDER_ERROR",
      });
      return {
        status: "error",
        message: mapAuthError(error),
        requestId,
      };
    }

    return {
      status: "success",
      message:
        "Yêu cầu đăng ký đã được ghi nhận. Hãy kiểm tra email để xác minh tài khoản trước khi tiếp tục.",
      requestId,
    };
  } catch (error) {
    logServerEvent("error", {
      event: "auth.register.failed",
      requestId,
      route: "registerAction",
      stage: "supabase sign up",
      errorCode: "AUTH_UNEXPECTED_ERROR",
      error,
    });
    return {
      status: "error",
      message: mapAuthError(undefined),
      requestId,
    };
  }
}

export async function loginAction(
  _previousState: ActionState<LoginField>,
  formData: FormData,
): Promise<ActionState<LoginField>> {
  const requestId = await getServerRequestId();
  const result = loginSchema.safeParse({
    email: valueOf(formData, "email"),
    password: valueOf(formData, "password"),
    next: valueOf(formData, "next"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      logServerEvent("warn", {
        event: "auth.login.rejected",
        requestId,
        route: "loginAction",
        stage: "supabase sign in",
        errorCode: error.code ?? "AUTH_PROVIDER_ERROR",
      });
      return {
        status: "error",
        message: mapAuthError(error),
        requestId,
      };
    }
  } catch (error) {
    logServerEvent("error", {
      event: "auth.login.failed",
      requestId,
      route: "loginAction",
      stage: "supabase sign in",
      errorCode: "AUTH_UNEXPECTED_ERROR",
      error,
    });
    return {
      status: "error",
      message: mapAuthError(undefined),
      requestId,
    };
  }

  redirect(getSafeRedirectPath(result.data.next));
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function forgotPasswordAction(
  _previousState: ActionState<ForgotPasswordField>,
  formData: FormData,
): Promise<ActionState<ForgotPasswordField>> {
  const requestId = await getServerRequestId();
  const result = forgotPasswordSchema.safeParse({
    email: valueOf(formData, "email"),
  });
  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại địa chỉ email.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  try {
    const callbackUrl = new URL("/auth/recovery", siteConfig.url);
    callbackUrl.searchParams.set("next", "/reset-password");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      result.data.email,
      { redirectTo: callbackUrl.toString() },
    );
    if (error) {
      logServerEvent("warn", {
        event: "auth.password_recovery.request_rejected",
        requestId,
        route: "forgotPasswordAction",
        stage: "request recovery email",
        errorCode: error.code ?? "AUTH_PROVIDER_ERROR",
      });
    }
  } catch (error) {
    logServerEvent("error", {
      event: "auth.password_recovery.request_failed",
      requestId,
      route: "forgotPasswordAction",
      stage: "request recovery email",
      errorCode: "AUTH_UNEXPECTED_ERROR",
      error,
    });
  }

  return {
    status: "success",
    message:
      "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email đó.",
    requestId,
  };
}

export async function resetPasswordAction(
  _previousState: ActionState<ResetPasswordField>,
  formData: FormData,
): Promise<ActionState<ResetPasswordField>> {
  const requestId = await getServerRequestId();
  const result = resetPasswordSchema.safeParse({
    password: valueOf(formData, "password"),
    confirmPassword: valueOf(formData, "confirmPassword"),
  });
  if (!result.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại mật khẩu mới.",
      fieldErrors: result.error.flatten().fieldErrors,
      requestId,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return {
        status: "error",
        message:
          "Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.",
        requestId,
      };
    }
    const { error } = await supabase.auth.updateUser({
      password: result.data.password,
    });
    if (error) {
      logServerEvent("warn", {
        event: "auth.password_recovery.update_rejected",
        requestId,
        route: "resetPasswordAction",
        stage: "update password",
        errorCode: error.code ?? "AUTH_PROVIDER_ERROR",
      });
      return {
        status: "error",
        message:
          "Không thể cập nhật mật khẩu. Hãy yêu cầu liên kết khôi phục mới.",
        requestId,
      };
    }
    await supabase.auth.signOut({ scope: "local" });
    return {
      status: "success",
      message: "Mật khẩu đã được cập nhật. Hãy đăng nhập lại.",
      requestId,
    };
  } catch (error) {
    logServerEvent("error", {
      event: "auth.password_recovery.update_failed",
      requestId,
      route: "resetPasswordAction",
      stage: "update password",
      errorCode: "AUTH_UNEXPECTED_ERROR",
      error,
    });
    return {
      status: "error",
      message:
        "Không thể cập nhật mật khẩu. Hãy yêu cầu liên kết khôi phục mới.",
      requestId,
    };
  }
}
