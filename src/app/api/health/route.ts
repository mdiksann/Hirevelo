import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkDatabase } from "@/lib/queries/health";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const parsedId = z
    .string()
    .uuid()
    .safeParse(request.headers.get("x-request-id"));
  const requestId = parsedId.success ? parsedId.data : crypto.randomUUID();
  try {
    await checkDatabase();
    return NextResponse.json(
      { status: "ok", db: "up" },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } },
    );
  } catch {
    logger.error("health_check_failed", {
      requestId,
      code: "DATABASE_UNAVAILABLE",
    });
    return NextResponse.json(
      { status: "error", db: "down" },
      {
        status: 503,
        headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
      },
    );
  }
}
