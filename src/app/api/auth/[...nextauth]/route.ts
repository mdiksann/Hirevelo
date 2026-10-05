import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { RateLimitError } from "@/lib/errors";
import { authIp, limitAuthAttempt } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = handlers.GET;
export async function POST(request: NextRequest) {
  if (/\/(callback|signin)\/credentials$/.test(request.nextUrl.pathname)) {
    try {
      limitAuthAttempt(authIp(request.headers));
    } catch (error) {
      if (!(error instanceof RateLimitError)) throw error;
      logger.warn("auth_rate_limited", {
        code: error.code,
        requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      });
      return NextResponse.json(
        { message: error.message },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfter),
            "Cache-Control": "no-store",
          },
        },
      );
    }
  }
  return handlers.POST(request);
}
