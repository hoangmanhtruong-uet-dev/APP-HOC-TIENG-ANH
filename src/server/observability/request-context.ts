import "server-only";

import { headers } from "next/headers";

import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";

export async function getServerRequestId(): Promise<string> {
  try {
    const requestHeaders = await headers();
    return resolveRequestId(requestHeaders.get(REQUEST_ID_HEADER));
  } catch {
    return resolveRequestId(undefined);
  }
}
