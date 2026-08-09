import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/server/observability/logger";

const allowedConfirmationTypes = new Set<EmailOtpType>(["email", "signup"]);

function noStoreRedirect(url: URL, requestId: string) {
  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Expires: "0",
      Pragma: "no-cache",
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const type = rawType as EmailOtpType | null;

  if (tokenHash && type && allowedConfirmationTypes.has(type)) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (!error) {
        const successUrl = request.nextUrl.clone();
        successUrl.pathname = getSafeRedirectPath(
          request.nextUrl.searchParams.get("next"),
        );
        successUrl.search = "";
        return noStoreRedirect(successUrl, requestId);
      }
      logServerEvent("warn", {
        event: "auth.confirm.rejected",
        requestId,
        route: "/auth/confirm",
        stage: "verify otp",
        errorCode: error.code ?? "AUTH_CONFIRMATION_REJECTED",
      });
    } catch (error) {
      logServerEvent("error", {
        event: "auth.confirm.failed",
        requestId,
        route: "/auth/confirm",
        stage: "verify otp",
        errorCode: "AUTH_CONFIRMATION_UNEXPECTED_ERROR",
        error,
      });
      // Fall through to the same generic confirmation failure state.
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/login";
  errorUrl.search = "";
  errorUrl.searchParams.set("authError", "confirmation_invalid");
  return noStoreRedirect(errorUrl, requestId);
}
