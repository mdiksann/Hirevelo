import { describe, expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { validateEnv } from "@/lib/env";
import { paginate } from "@/lib/types/pagination";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  StorageError,
} from "@/lib/errors";
import { fieldErrors, handleActionError } from "@/types/action-result";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session-stub";

const valid = {
  DATABASE_URL: "postgresql://user:pass@localhost/hirevelo",
  AUTH_SECRET: "a".repeat(32),
  AUTH_URL: "http://localhost:3000",
  STORAGE_DIR: "./storage/cv",
};
afterEach(() => vi.restoreAllMocks());
describe("environment", () => {
  it("accepts valid configuration and defaults", () =>
    expect(validateEnv(valid).LOG_LEVEL).toBe("debug"));
  it("lists missing fields without exposing secret values", () =>
    expect(() => validateEnv({ AUTH_SECRET: "private" })).toThrow(
      /DATABASE_URL/,
    ));
  it.each(["invalid", "https://example.com/db"])(
    "rejects database URL %s",
    (DATABASE_URL) =>
      expect(() => validateEnv({ ...valid, DATABASE_URL })).toThrow(
        /DATABASE_URL/,
      ),
  );
  it("rejects invalid auth URLs and unmatched seed variables", () => {
    expect(() =>
      validateEnv({ ...valid, AUTH_URL: "ftp://localhost" }),
    ).toThrow(/AUTH_URL/);
    expect(() =>
      validateEnv({ ...valid, SEED_RECRUITER_EMAIL: "user@example.com" }),
    ).toThrow(/seed variables/);
  });
  it("defaults production logging to info", () =>
    expect(validateEnv({ ...valid, NODE_ENV: "production" }).LOG_LEVEL).toBe(
      "info",
    ));
});
describe("pagination", () => {
  it("uses bounded defaults", () =>
    expect(paginate()).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 }));
  it("clamps negative and oversized values", () =>
    expect(paginate({ page: -3, pageSize: 1000 })).toEqual({
      page: 1,
      pageSize: 100,
      skip: 0,
      take: 100,
    }));
  it("handles nonfinite and fractional values", () => {
    expect(paginate({ page: Infinity, pageSize: NaN }).skip).toBe(0);
    expect(paginate({ page: 2.9, pageSize: 3.9 }).skip).toBe(3);
  });
});
describe("errors and logging", () => {
  it.each([
    [new ValidationError(), 400],
    [new NotFoundError(), 404],
    [new ForbiddenError(), 403],
    [new ConflictError(), 409],
    [new StorageError(), 500],
  ])("has safe typed error metadata", (error, status) => {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).httpStatus).toBe(status);
  });
  it("groups nested field paths and returns safe validation failures", () => {
    const result = z
      .object({ job: z.object({ title: z.string().min(3) }) })
      .safeParse({ job: { title: "" } });
    if (result.success) throw new Error("Expected validation error");
    expect(fieldErrors(result.error)).toEqual({
      "job.title": ["String must contain at least 3 character(s)"],
    });
    expect(handleActionError(result.error)).toMatchObject({
      ok: false,
      errors: { "job.title": expect.any(Array) },
    });
  });
  it.each([
    ["P2002", "already exists"],
    ["P2025", "could not be found"],
    ["P2003", "invalid reference"],
  ])("maps %s", (code, message) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Prisma.PrismaClientKnownRequestError(
      "private database message",
      { code, clientVersion: "6" },
    );
    expect(handleActionError(error)).toMatchObject({
      ok: false,
      message: expect.stringContaining(message),
    });
  });
  it("logs unknown failures without leaking error content", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(handleActionError(new Error("secret SQL password"))).toEqual({
      ok: false,
      message: "Something went wrong. Please try again.",
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret SQL");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({
      code: "INTERNAL_ERROR",
      requestId: expect.any(String),
    });
  });
  it("returns explicit safe AppErrors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(handleActionError(new ForbiddenError())).toMatchObject({
      ok: false,
      message: "You do not have access to this item.",
    });
  });
  it("filters secrets and applies log levels", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("test_event", {
      requestId: "request-1",
      code: "TEST",
      password: "secret",
      cookies: "secret",
      body: { nested: "secret" },
      email: "private@example.com",
    });
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toEqual({
      level: "info",
      event: "test_event",
      timestamp: expect.any(String),
      requestId: "request-1",
      code: "TEST",
    });
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const oldLevel = env.LOG_LEVEL;
    env.LOG_LEVEL = "error";
    logger.debug("hidden");
    env.LOG_LEVEL = oldLevel;
    expect(debug).not.toHaveBeenCalled();
  });
});
it("never returns the session stub in production", async () => {
  const old = env.NODE_ENV;
  env.NODE_ENV = "production";
  expect(await getSession()).toBeNull();
  env.NODE_ENV = old;
});

it("groups prototype-named field errors safely", () => {
  const error = new z.ZodError([
    { code: "custom", path: ["__proto__"], message: "Invalid" },
  ]);
  expect(Object.hasOwn(fieldErrors(error), "__proto__")).toBe(true);
  expect(fieldErrors(error)["__proto__"]).toEqual(["Invalid"]);
});
