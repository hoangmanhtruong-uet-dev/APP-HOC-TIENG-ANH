import { NextResponse, type NextRequest } from "next/server";

import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/server/observability/logger";

function redirectNoStore(url: URL, requestId: string) {
  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const successUrl = request.nextUrl.clone();
        successUrl.pathname = "/reset-password";
        successUrl.search = "";
        return redirectNoStore(successUrl, requestId);
      }
      logServerEvent("warn", {
        event: "auth.password_recovery.exchange_rejected",
        requestId,
        route: "/auth/recovery",
        stage: "exchange recovery code",
        errorCode: error.code ?? "AUTH_RECOVERY_REJECTED",
      });
    } catch (error) {
      logServerEvent("error", {
        event: "auth.password_recovery.exchange_failed",
        requestId,
        route: "/auth/recovery",
        stage: "exchange recovery code",
        errorCode: "AUTH_UNEXPECTED_ERROR",
        error,
      });
    }
  }

  const failureUrl = request.nextUrl.clone();
  failureUrl.pathname = "/forgot-password";
  failureUrl.search = "";
  failureUrl.searchParams.set("recoveryError", "invalid_or_expired");
  return redirectNoStore(failureUrl, requestId);
}
