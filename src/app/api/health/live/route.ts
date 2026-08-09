import { NextResponse, type NextRequest } from "next/server";

import { createApiSuccess, createRequestId } from "@/lib/api/errors";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";

export function GET(request?: NextRequest) {
  const requestId = request
    ? resolveRequestId(request.headers.get(REQUEST_ID_HEADER))
    : createRequestId();

  return NextResponse.json(
    createApiSuccess(
      {
        status: "ok",
      },
      requestId,
    ),
    {
      headers: {
        "Cache-Control": "no-store",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}
