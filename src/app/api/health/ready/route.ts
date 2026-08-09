import { NextResponse, type NextRequest } from "next/server";

import {
  createApiError,
  createApiSuccess,
  createRequestId,
} from "@/lib/api/errors";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";
import { EnvironmentValidationError } from "@/lib/env";
import {
  assertProductionReadiness,
  DependencyReadinessError,
} from "@/server/health/readiness";
import { logServerEvent } from "@/server/observability/logger";

export async function GET(request?: NextRequest) {
  const requestId = request
    ? resolveRequestId(request.headers.get(REQUEST_ID_HEADER))
    : createRequestId();

  try {
    const readiness = await assertProductionReadiness();

    return NextResponse.json(
      createApiSuccess(
        {
          status:
            readiness.optionalAi.overall === "misconfigured"
              ? "degraded"
              : "ready",
          dependencies: readiness.dependencies,
          optionalAi: readiness.optionalAi,
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
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      logServerEvent("error", {
        event: "readiness.failed",
        requestId,
        route: "/api/health/ready",
        stage: "validate configuration",
        errorCode: "CONFIGURATION_ERROR",
        error,
        metadata: { fields: error.fields },
      });
      const response = createApiError(
        "CONFIGURATION_ERROR",
        "Required production environment variables are missing or invalid.",
        requestId,
      );
      return NextResponse.json(
        {
          ...response,
          details: {
            fields: error.fields,
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            [REQUEST_ID_HEADER]: requestId,
          },
        },
      );
    }

    if (error instanceof DependencyReadinessError) {
      logServerEvent("error", {
        event: "readiness.failed",
        requestId,
        route: "/api/health/ready",
        stage: `check ${error.dependency}`,
        errorCode: "DEPENDENCY_UNAVAILABLE",
        error,
        metadata: { dependency: error.dependency },
      });
      return NextResponse.json(
        createApiError(
          "DEPENDENCY_UNAVAILABLE",
          "A required dependency is unavailable.",
          requestId,
        ),
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            [REQUEST_ID_HEADER]: requestId,
          },
        },
      );
    }

    logServerEvent("error", {
      event: "readiness.failed",
      requestId,
      route: "/api/health/ready",
      stage: "unknown",
      errorCode: "INTERNAL_ERROR",
      error,
    });
    return NextResponse.json(
      createApiError("INTERNAL_ERROR", "Readiness check failed.", requestId),
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          [REQUEST_ID_HEADER]: requestId,
        },
      },
    );
  }
}
