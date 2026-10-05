import { afterEach, describe, expect, it, vi } from "vitest";
import { registerSchema, signInSchema } from "@/lib/validation/auth";
import { authIp, AUTH_WINDOW_MS, createRateLimiter } from "@/lib/rate-limit";
import { AuthError, ForbiddenError, RateLimitError } from "@/lib/errors";
import { bootstrapDecision } from "@/lib/bootstrap";

const mocked = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocked.auth }));
import {
  requireSession,
  requireRecruiter,
  requireCandidate,
  requireOwnership,
} from "@/lib/auth-helpers";
afterEach(() => vi.restoreAllMocks());

describe("auth input", () => {
  const valid = {
    name: "  Ada Lovelace  ",
    email: " ADA@Example.COM ",
    password: "Strong-password-1",
  };
  it("normalizes names/emails and strips client roles", () => {
    expect(registerSchema.parse({ ...valid, role: "RECRUITER" })).toEqual({
      ...valid,
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });
  it.each([
    { name: "x" },
    { name: "x".repeat(81) },
    { email: "bad" },
    { password: "short1" },
    { password: "abcdefgh" },
    { password: "12345678" },
    { password: "A1" + "x".repeat(71) },
    { password: "A1" + "é".repeat(36) },
  ])("rejects invalid registration %j", (patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(
      false,
    );
  });
  it("accepts the 72-byte boundary and does not trim passwords", () => {
    expect(
      registerSchema.parse({ ...valid, password: "A1" + "é".repeat(35) })
        .password,
    ).toHaveLength(37);
    expect(
      signInSchema.parse({ email: valid.email, password: " p " }).password,
    ).toBe(" p ");
    expect(
      signInSchema.safeParse({ email: valid.email, password: "" }).success,
    ).toBe(false);
  });
});
describe("limiter", () => {
  it("allows ten attempts, rejects eleven with 429, and expires at fifteen minutes", () => {
    const limit = createRateLimiter();
    for (let i = 0; i < 10; i++) limit("one", 0);
    expect(() => limit("one", 1)).toThrow(RateLimitError);
    try {
      limit("one", 1);
    } catch (error) {
      expect(error).toMatchObject({ httpStatus: 429, retryAfter: 900 });
    }
    expect(() => limit("two", 1)).not.toThrow();
    expect(() => limit("one", AUTH_WINDOW_MS)).not.toThrow();
  });
  it("uses the nearest ingress IP, rejecting malformed identifiers", () => {
    expect(authIp(new Headers({ "x-forwarded-for": "spoof, 192.0.2.1" }))).toBe(
      "192.0.2.1",
    );
    expect(authIp(new Headers({ "x-forwarded-for": "bad" }))).toBe("unknown");
    expect(authIp(new Headers())).toBe("unknown");
  });
});
describe("bootstrap", () => {
  it.each([
    [false, false, false, "skip"],
    [false, false, true, "skip"],
    [true, true, false, "skip"],
    [true, true, true, "skip"],
    [true, false, false, "warn"],
    [true, false, true, "create"],
  ])(
    "production=%s exists=%s configured=%s → %s",
    (production, exists, configured, expected) => {
      expect(bootstrapDecision(production, exists, configured)).toBe(expected);
    },
  );
});
describe("authorization", () => {
  it.each([null, "CANDIDATE", "RECRUITER"] as const)(
    "checks every helper for %s",
    async (role) => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const session = role
        ? { user: { id: "owner", role }, expires: "2099-01-01" }
        : null;
      mocked.auth.mockResolvedValue(session);
      for (const [helper, allowed] of [
        [requireSession, Boolean(role)],
        [requireCandidate, role === "CANDIDATE"],
        [requireRecruiter, role === "RECRUITER"],
        [() => requireOwnership("owner"), Boolean(role)],
        [() => requireOwnership("other"), role === "RECRUITER"],
      ] as const) {
        if (allowed) expect(await helper()).toEqual(session);
        else
          await expect(helper()).rejects.toBeInstanceOf(
            role ? ForbiddenError : AuthError,
          );
      }
    },
  );
});
