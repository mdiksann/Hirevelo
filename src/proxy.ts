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
  const protectedRoute =
    request.nextUrl.pathname !== "/recruiter/sign-in" &&
    /^\/(recruiter|applications)(\/|$)/.test(request.nextUrl.pathname);
  const token = protectedRoute
    ? await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        secureCookie:
          new URL(process.env.AUTH_URL ?? request.url).protocol === "https:",
      })
    : null;
  const portal = request.nextUrl.pathname.startsWith("/recruiter")
    ? "recruiter"
    : "candidate";
  const response =
    protectedRoute && (!token || token.role !== portal.toUpperCase())
      ? NextResponse.redirect(
          new URL(
            portal === "recruiter" ? "/recruiter/sign-in" : "/sign-in",
            request.url,
          ),
        )
      : NextResponse.next({ request: { headers } });
  if (protectedRoute)
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
