import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getPublishedJobs, getJobBySlug } from "@/lib/queries/jobs";
import { GET } from "@/app/api/health/route";
import { seed } from "../../prisma/seed";

beforeAll(async () => {
  await prisma.$transaction([
    prisma.activity.deleteMany(),
    prisma.note.deleteMany(),
    prisma.application.deleteMany(),
    prisma.fileObject.deleteMany(),
    prisma.job.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await seed();
});
afterAll(() => prisma.$disconnect());
describe("schema constraints", () => {
  it("rejects a duplicate application pair at the database", async () => {
    const existing = await prisma.application.findFirstOrThrow();
    await expect(
      prisma.application.create({
        data: {
          job: { connect: { id: existing.jobId } },
          candidate: { connect: { id: existing.candidateId } },
          cvFile: { connect: { id: existing.cvFileId } },
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("restricts deletion of an application with activity, retaining notes/history", async () => {
    const existing = await prisma.application.findFirstOrThrow({
      where: { notes: { some: {} } },
    });
    await expect(
      prisma.application.delete({ where: { id: existing.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
    expect(
      await prisma.note.count({ where: { applicationId: existing.id } }),
    ).toBe(1);
    expect(
      await prisma.activity.count({ where: { applicationId: existing.id } }),
    ).toBeGreaterThan(0);
  });
  it("accepts nullable activity data and restricts job deletion", async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { role: "RECRUITER" },
    });
    const activity = await prisma.activity.create({
      data: { type: "JOB_UPDATED", actor: { connect: { id: user.id } } },
    });
    expect(activity.data).toBeNull();
    const job = await prisma.job.findFirstOrThrow({
      where: { applications: { some: {} } },
    });
    await expect(
      prisma.job.delete({ where: { id: job.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
    await prisma.activity.delete({ where: { id: activity.id } });
  });
  it("stores hashes and all standard auth tables migrate", async () => {
    const user = await prisma.user.findFirstOrThrow();
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user).not.toHaveProperty("password");
    await prisma.account.count();
    await prisma.session.count();
    await prisma.verificationToken.count();
  });
});
describe("published job queries", () => {
  it("filters search case-insensitively and returns safe serializable DTOs", async () => {
    const result = await getPublishedJobs({ q: "  DESIGNER  " });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      title: "Product designer",
      publishedAt: expect.any(String),
    });
    expect(Object.keys(result.items[0] ?? {}).sort()).toEqual(
      [
        "description",
        "employmentType",
        "id",
        "location",
        "publishedAt",
        "salaryMax",
        "salaryMin",
        "slug",
        "title",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });
  it("clamps pagination and handles empty and out-of-range results", async () => {
    expect(await getPublishedJobs({ page: -3, pageSize: 1000 })).toMatchObject({
      page: 1,
      pageSize: 100,
      total: 2,
    });
    expect(
      (await getPublishedJobs({ page: 1, pageSize: 1 })).items,
    ).toHaveLength(1);
    expect((await getPublishedJobs({ page: 100 })).items).toEqual([]);
    expect(await getPublishedJobs({ q: "no matching job" })).toMatchObject({
      total: 0,
      items: [],
    });
  });
  it("hides unpublished slugs and unknown jobs", async () => {
    expect(await getJobBySlug("product-designer")).toMatchObject({
      slug: "product-designer",
    });
    for (const slug of [
      "operations-specialist",
      "people-partner",
      "support-specialist",
      "missing",
    ])
      expect(await getJobBySlug(slug)).toBeNull();
    await expect(getJobBySlug("../private")).rejects.toThrow();
    await expect(getPublishedJobs({ q: 123 })).rejects.toThrow();
  });
});
it("seed is idempotent with the required demo distribution", async () => {
  const counts = async () => [
    await prisma.user.count(),
    await prisma.job.count(),
    await prisma.application.count(),
    await prisma.note.count(),
    await prisma.activity.count(),
    await prisma.fileObject.count(),
  ];
  const before = await counts();
  await seed();
  expect(await counts()).toEqual(before);
  expect(before.slice(0, 4)).toEqual([4, 5, 6, 1]);
  expect(await prisma.user.count({ where: { role: "RECRUITER" } })).toBe(1);
  expect(await prisma.job.groupBy({ by: ["status"] })).toHaveLength(4);
  expect(await prisma.application.groupBy({ by: ["stage"] })).toHaveLength(6);
});
it("health returns 200 with a real database and preserves request ids", async () => {
  const requestId = crypto.randomUUID();
  const response = await GET(
    new NextRequest("http://localhost/api/health", {
      headers: { "x-request-id": requestId },
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", db: "up" });
  expect(response.headers.get("x-request-id")).toBe(requestId);
});
it("health returns safe 503 and structured log when DB fails", async () => {
  const database = vi
    .spyOn(prisma.user, "count")
    .mockRejectedValueOnce(new Error("secret connection string"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await GET(
    new NextRequest("http://localhost/api/health", {
      headers: { "x-request-id": "untrusted\tmetadata" },
    }),
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "error", db: "down" });
  expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
    code: "DATABASE_UNAVAILABLE",
    requestId: expect.any(String),
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret connection");
  database.mockRestore();
  log.mockRestore();
});

it("health returns 503 with an actually unreachable PostgreSQL URL", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/fixtures/health-check.ts",
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL:
          "postgresql://unavailable:unavailable@127.0.0.1:1/hirevelo_test?connect_timeout=1",
      },
      encoding: "utf8",
      timeout: 10000,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  expect(JSON.parse(output)).toEqual({
    status: 503,
    body: { status: "error", db: "down" },
  });
});
