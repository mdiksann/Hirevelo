import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { seed } from "../../prisma/seed";

const context = vi.hoisted(() => ({
  ip: "192.0.2.50",
  jar: new Map<string, string>(),
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-for": context.ip,
      cookie: [...context.jar].map(([k, v]) => `${k}=${v}`).join("; "),
    }),
  cookies: async () => ({
    set: (name: string, value: string) => context.jar.set(name, value),
    get: (name: string) => ({ value: context.jar.get(name) }),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import { auth, handlers } from "@/lib/auth";
import { POST } from "@/app/api/auth/[...nextauth]/route";
import { registerCandidate, signInAction, signOutAction } from "@/actions/auth";
import {
  requireRecruiter,
  requireCandidate,
  requireOwnership,
} from "@/lib/auth-helpers";
import { bootstrapRecruiter } from "@/lib/bootstrap";

const email = `auth-${crypto.randomUUID()}@example.com`;
beforeAll(async () => {
  await seed();
});
afterEach(() => {
  context.jar.clear();
  context.ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
  vi.restoreAllMocks();
});
afterAll(async () => {
  await prisma.session.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});
function saveCookies(response: Response) {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";")[0] ?? "";
    const split = pair.indexOf("=");
    context.jar.set(pair.slice(0, split), pair.slice(split + 1));
  }
}
async function httpSignIn(password: string, ip: string) {
  const csrf = await handlers.GET(
    new NextRequest(`${env.AUTH_URL}/api/auth/csrf`),
  );
  saveCookies(csrf);
  const { csrfToken } = await csrf.json();
  const response = await POST(
    new NextRequest(`${env.AUTH_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": ip,
        cookie: [...context.jar].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: new URLSearchParams({
        csrfToken,
        email: "candidate1@example.com",
        password,
      }),
    }),
  );
  saveCookies(response);
  return response;
}
describe("real auth and registration", () => {
  it("creates a hashed candidate, strips recruiter role, and signs in", async () => {
    await expect(
      registerCandidate({
        name: "Test candidate",
        email: email.toUpperCase(),
        password: "Strong-password-1",
        role: "RECRUITER",
      }),
    ).rejects.toThrow("redirect:/");
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe("CANDIDATE");
    expect(user.passwordHash).not.toBe("Strong-password-1");
    expect(await compare("Strong-password-1", user.passwordHash)).toBe(true);
    expect(await auth()).toMatchObject({
      user: { id: user.id, role: "CANDIDATE" },
    });
  });
  it("maps duplicate normalized email to the field and validates before writing", async () => {
    expect(
      await registerCandidate({
        name: "Duplicate",
        email,
        password: "Strong-password-1",
      }),
    ).toMatchObject({ ok: false, errors: { email: [expect.any(String)] } });
    expect(
      await registerCandidate({ name: "x", email: "bad", password: "short" }),
    ).toMatchObject({
      ok: false,
      errors: {
        name: expect.any(Array),
        email: expect.any(Array),
        password: expect.any(Array),
      },
    });
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
  it.each([
    ["recruiter@example.com", "/recruiter", "RECRUITER"],
    ["candidate1@example.com", "/", "CANDIDATE"],
  ])(
    "logs in %s with typed auth() and enforced helpers",
    async (account, destination, role) => {
      await expect(
        signInAction({ email: account, password: "Demo-password-123" }),
      ).rejects.toThrow(`redirect:${destination}`);
      const session = await auth();
      expect(session).toMatchObject({ user: { id: expect.any(String), role } });
      if (role === "RECRUITER") {
        await expect(requireRecruiter()).resolves.toMatchObject({
          user: { role },
        });
        await expect(requireCandidate()).rejects.toMatchObject({
          httpStatus: 403,
        });
        await expect(requireOwnership("other")).resolves.toBeTruthy();
      } else {
        await expect(requireCandidate()).resolves.toMatchObject({
          user: { role },
        });
        await expect(requireRecruiter()).rejects.toMatchObject({
          httpStatus: 403,
        });
        await expect(requireOwnership("other")).rejects.toMatchObject({
          httpStatus: 403,
        });
      }
    },
  );
  it("returns identical wrong-password and unknown-account failures", async () => {
    const wrong = await signInAction({
      email: "candidate1@example.com",
      password: "wrong",
    });
    expect(wrong).toEqual({ ok: false, message: "Invalid email or password." });
    expect(
      await signInAction({ email: "nobody@example.com", password: "wrong" }),
    ).toEqual(wrong);
    expect(await auth()).toBeNull();
  });
  it("invalidates copied cookies at sign-out", async () => {
    await expect(
      signInAction({
        email: "candidate1@example.com",
        password: "Demo-password-123",
      }),
    ).rejects.toThrow("redirect:/");
    const copied = new Map(context.jar);
    await expect(signOutAction()).rejects.toThrow("redirect:/");
    context.jar = copied;
    expect(await auth()).toBeNull();
  });
  it("expires server-side sessions", async () => {
    await expect(
      signInAction({
        email: "candidate1@example.com",
        password: "Demo-password-123",
      }),
    ).rejects.toThrow("redirect:/");
    const session = await auth();
    await prisma.session.updateMany({
      where: { userId: session?.user.id },
      data: { expires: new Date(0) },
    });
    expect(await auth()).toBeNull();
  });
});
describe("HTTP throttling and provisioning", () => {
  it("returns HTTP 429 on eleven failed direct sign-ins", async () => {
    for (let index = 0; index < 10; index++)
      expect((await httpSignIn("wrong", "198.51.100.99")).status).not.toBe(429);
    const blocked = await httpSignIn("wrong", "198.51.100.99");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({
      message: "Too many attempts. Please try again in 15 minutes.",
    });
  });
  it("allows a valid login after a few failures within the window", async () => {
    for (let index = 0; index < 3; index++)
      await httpSignIn("wrong", "198.51.100.100");
    expect(
      (await httpSignIn("Demo-password-123", "198.51.100.100")).status,
    ).not.toBe(429);
    expect(await auth()).toMatchObject({ user: { role: "CANDIDATE" } });
  });
  it("shares limiter enforcement across registration and server sign-in", async () => {
    context.ip = "198.51.100.101";
    for (let index = 0; index < 10; index++)
      await signInAction({ email: "bad", password: "" });
    expect(
      await registerCandidate({
        name: "Test",
        email: "blocked@example.com",
        password: "Strong-password-1",
      }),
    ).toMatchObject({ ok: false, status: 429 });
    expect(
      await prisma.user.count({ where: { email: "blocked@example.com" } }),
    ).toBe(0);
  });
  it("seed is idempotent and does not replace recruiter hashes", async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { email: "recruiter@example.com" },
    });
    const counts = [
      await prisma.user.count(),
      await prisma.application.count(),
      await prisma.activity.count(),
    ];
    await seed();
    expect([
      await prisma.user.count(),
      await prisma.application.count(),
      await prisma.activity.count(),
    ]).toEqual(counts);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { email: before.email } }))
        .passwordHash,
    ).toBe(before.passwordHash);
  });
  it("production bootstrap provisions an env-only recruiter without promoting a candidate", async () => {
    const old = {
      mode: env.NODE_ENV,
      email: env.SEED_RECRUITER_EMAIL,
      password: env.SEED_RECRUITER_PASSWORD,
    };
    const bootstrapEmail = `bootstrap-${crypto.randomUUID()}@example.com`;
    try {
      env.NODE_ENV = "production";
      env.SEED_RECRUITER_EMAIL = bootstrapEmail;
      env.SEED_RECRUITER_PASSWORD = "Operator-password-1";
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
      await bootstrapRecruiter();
      const created = await prisma.user.findUniqueOrThrow({
        where: { email: bootstrapEmail },
      });
      expect(created.role).toBe("RECRUITER");
      expect(await compare("Operator-password-1", created.passwordHash)).toBe(
        true,
      );
      await bootstrapRecruiter();
      expect(
        await prisma.user.count({ where: { email: bootstrapEmail } }),
      ).toBe(1);
      env.SEED_RECRUITER_EMAIL = "candidate1@example.com";
      await bootstrapRecruiter();
      expect(
        (
          await prisma.user.findUniqueOrThrow({
            where: { email: "candidate1@example.com" },
          })
        ).role,
      ).toBe("CANDIDATE");
    } finally {
      env.NODE_ENV = old.mode;
      env.SEED_RECRUITER_EMAIL = old.email;
      env.SEED_RECRUITER_PASSWORD = old.password;
      await prisma.user.deleteMany({ where: { email: bootstrapEmail } });
    }
  });
  it("production boot warns if no recruiter exists and env vars are missing", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const old = {
      mode: env.NODE_ENV,
      email: env.SEED_RECRUITER_EMAIL,
      password: env.SEED_RECRUITER_PASSWORD,
    };
    try {
      env.NODE_ENV = "production";
      env.SEED_RECRUITER_EMAIL = undefined;
      env.SEED_RECRUITER_PASSWORD = undefined;
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
      await bootstrapRecruiter();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("RECRUITER_MISSING"),
      );
    } finally {
      env.NODE_ENV = old.mode;
      env.SEED_RECRUITER_EMAIL = old.email;
      env.SEED_RECRUITER_PASSWORD = old.password;
    }
  });
});
