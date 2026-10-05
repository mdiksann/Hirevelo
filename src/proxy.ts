import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
export async function proxy(request: NextRequest) {
  const parsed = z
    .string()
    .uuid()
    .safeParse(request.headers.get("x-request-id"));
  const requestId = parsed.success ? parsed.data : crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);
  const protectedRoute = /^\/(recruiter|applications)(\/|$)/.test(
    request.nextUrl.pathname,
  );
  const token = protectedRoute
    ? await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie:
          new URL(process.env.AUTH_URL ?? request.url).protocol === "https:",
      })
    : null;
  const response =
    protectedRoute && !token
      ? NextResponse.redirect(new URL("/sign-in", request.url))
      : NextResponse.next({ request: { headers } });
  if (protectedRoute)
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
