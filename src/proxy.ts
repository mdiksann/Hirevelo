import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
export function proxy(request: NextRequest) {
  const parsed = z
    .string()
    .uuid()
    .safeParse(request.headers.get("x-request-id"));
  const requestId = parsed.success ? parsed.data : crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
