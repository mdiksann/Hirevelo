import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { proxy, config } from "@/proxy";
import { env } from "@/lib/env";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
// Importing database-backed auth in the proxy would make this suite fail.
vi.mock("@/lib/db", () => {
  throw new Error("Proxy must not load Prisma");
});
vi.mock("@/lib/auth", () => {
  throw new Error("Proxy must not load database auth");
});

it.each([
  "/recruiter",
  "/recruiter/jobs",
  "/recruiter/jobs/new",
  "/applications",
  "/applications/private",
])("redirects anonymous %s and preserves request IDs", async (path) => {
  expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(true);
  const response = await proxy(new NextRequest(`http://localhost:3100${path}`));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    `http://localhost:3100${path.startsWith("/recruiter") ? "/recruiter/sign-in" : "/sign-in"}`,
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-request-id")).toMatch(/^[a-f0-9-]{36}$/);
});
it.each([
  "/",
  "/careers",
  "/sign-in",
  "/recruiter/sign-in",
  "/register",
  "/recruiter-public",
  "/applications-public",
])("permits public %s", async (path) => {
  expect(
    (await proxy(new NextRequest(`http://localhost:3100${path}`))).status,
  ).toBe(200);
});
it.each(["CANDIDATE", "RECRUITER"] as const)(
  "routes a %s cookie to its login without database access",
  async (role) => {
    const secure = new URL(env.AUTH_URL).protocol === "https:";
    const name = `${secure ? "__Secure-" : ""}authjs.session-token`;
    const token = await encode({
      token: { sub: "owner", role, sessionId: "session" },
      secret: env.AUTH_SECRET,
      salt: name,
    });
    const wrongPortal = role === "CANDIDATE" ? "recruiter" : "candidate";
    const response = await proxy(
      new NextRequest(
        role === "CANDIDATE"
          ? "http://localhost:3100/recruiter/jobs"
          : "http://localhost:3100/applications",
        {
          headers: { cookie: `${name}=${token}` },
        },
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost:3100${wrongPortal === "recruiter" ? "/recruiter/sign-in" : "/sign-in"}`,
    );
    const allowed = await proxy(
      new NextRequest(
        role === "CANDIDATE"
          ? "http://localhost:3100/applications"
          : "http://localhost:3100/recruiter/jobs",
        { headers: { cookie: `${name}=${token}` } },
      ),
    );
    expect(allowed.status).toBe(200);
  },
);
