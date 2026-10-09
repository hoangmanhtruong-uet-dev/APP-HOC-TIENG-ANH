import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { ipRateLimit } from "@/lib/rate-limit";

export async function proxy(request: NextRequest) {
  // Rate limit for all /api/ routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    try {
      const { success } = await ipRateLimit.limit(ip);
      if (!success) {
        return new NextResponse("Too Many Requests", { status: 429 });
      }
    } catch (e) {
      console.error("Rate limit error:", e);
    }
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
