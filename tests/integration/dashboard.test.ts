import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { seed } from "../../prisma/seed";
const context = vi.hoisted(() => ({ id: "", role: "RECRUITER" }));
vi.mock("@/lib/auth", () => ({
  auth: async () =>
    context.role === "ANONYMOUS"
      ? null
      : { user: { id: context.id, role: context.role } },
}));
import { getDashboardStats, getRecentActivity } from "@/lib/queries/dashboard";
async function clearDatabase() {
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
}
beforeEach(async () => {
  vi.useRealTimers();
  await clearDatabase();
  await seed();
  context.role = "RECRUITER";
  context.id = (
    await prisma.user.findFirstOrThrow({ where: { role: "RECRUITER" } })
  ).id;
});
afterAll(async () => {
  vi.useRealTimers();
  await clearDatabase();
  await seed();
  await prisma.$disconnect();
});
describe("dashboard metrics", () => {
  it("matches the hand-counted seed and completes within 500 ms on a warm connection", async () => {
    const expected = {
      publishedJobs: 2,
      totalCandidates: 3,
      applicationsByStage: {
        APPLIED: 1,
        SCREENING: 1,
        INTERVIEW: 1,
        OFFERING: 1,
        HIRED: 1,
        REJECTED: 1,
      },
      appliedLast7Days: 0,
    };
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
    expect(await getDashboardStats()).toEqual(expected);
    const started = performance.now();
    expect(await getDashboardStats()).toEqual(expected);
    expect(performance.now() - started).toBeLessThan(500);
  });
  it("counts candidate accounts independently of applications and includes only the rolling seven-day window", async () => {
    const now = new Date("2026-10-06T12:00:00Z");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const candidate = await prisma.user.create({
      data: {
        name: "Unapplied candidate",
        email: "dashboard-candidate@example.com",
        passwordHash: "unused",
        role: "CANDIDATE",
      },
    });
    const file = await prisma.fileObject.create({
      data: {
        owner: { connect: { id: candidate.id } },
        storageKey: "dashboard-fixture",
        originalName: "cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
      },
    });
    const dates = [
      new Date(now.getTime() - 1000),
      new Date(now.getTime() - 7 * 86400000),
      new Date(now.getTime() - 7 * 86400000 - 1),
      new Date(now.getTime() + 1),
    ];
    const statuses = ["PUBLISHED", "DRAFT", "CLOSED", "ARCHIVED"] as const;
    for (const [i, appliedAt] of dates.entries()) {
      const job = await prisma.job.create({
        data: {
          title: `Dashboard ${i}`,
          slug: `dashboard-${i}`,
          description: "Dashboard test description.",
          location: "Remote",
          status: statuses[i],
          createdBy: { connect: { id: context.id } },
        },
      });
      await prisma.application.create({
        data: {
          candidate: { connect: { id: candidate.id } },
          job: { connect: { id: job.id } },
          cvFile: { connect: { id: file.id } },
          appliedAt,
          stage: "APPLIED",
        },
      });
    }
    expect(await getDashboardStats()).toEqual({
      publishedJobs: 3,
      totalCandidates: 4,
      appliedLast7Days: 2,
      applicationsByStage: {
        APPLIED: 5,
        SCREENING: 1,
        INTERVIEW: 1,
        OFFERING: 1,
        HIRED: 1,
        REJECTED: 1,
      },
    });
    await prisma.application.deleteMany({
      where: { candidateId: candidate.id },
    });
    expect((await getDashboardStats()).totalCandidates).toBe(4);
  });
  it("returns every stage at zero and an empty feed when there is no business data", async () => {
    await clearDatabase();
    expect(await getDashboardStats()).toEqual({
      publishedJobs: 0,
      totalCandidates: 0,
      appliedLast7Days: 0,
      applicationsByStage: {
        APPLIED: 0,
        SCREENING: 0,
        INTERVIEW: 0,
        OFFERING: 0,
        HIRED: 0,
        REJECTED: 0,
      },
    });
    expect(await getRecentActivity()).toEqual([]);
  });
});
describe("recent activity and authorization", () => {
  it("returns the latest ten across jobs, with deterministic tie order and safe summaries", async () => {
    const apps = await prisma.application.findMany({
      orderBy: { id: "asc" },
      take: 2,
      select: { id: true, jobId: true },
    });
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) {
      const app = apps[i % 2];
      if (!app) throw new Error("Missing seed application");
      const item = await prisma.activity.create({
        data: {
          type: i === 11 ? "JOB_UPDATED" : "STAGE_CHANGED",
          actor: { connect: { id: context.id } },
          job: { connect: { id: app.jobId } },
          ...(i !== 11 ? { application: { connect: { id: app.id } } } : {}),
          createdAt: new Date("2026-10-05T12:00:00Z"),
          data:
            i === 11
              ? { from: "DRAFT", to: "PUBLISHED" }
              : {
                  from: "APPLIED",
                  to: "SCREENING",
                  comment: "Reviewer comment",
                },
        },
      });
      ids.push(item.id);
    }
    const rows = await getRecentActivity();
    expect(rows.map((row) => row.id)).toEqual(
      ids.sort().reverse().slice(0, 10),
    );
    expect(await getRecentActivity(3)).toHaveLength(3);
    expect(rows.every((row) => row.job?.id)).toBe(true);
    expect(rows.some((row) => row.application === null)).toBe(true);
    expect(
      rows
        .filter((row) => row.application)
        .every((row) => row.application?.candidate.name),
    ).toBe(true);
    for (const row of rows) {
      expect(row.createdAt).toBe("2026-10-05T12:00:00.000Z");
      expect(row.actor).toBe("Demo recruiter");
      if (row.application) {
        expect(
          await prisma.application.findUnique({
            where: { id: row.application.id },
            select: { id: true },
          }),
        ).not.toBeNull();
        expect(row).toMatchObject({
          from: "APPLIED",
          to: "SCREENING",
          comment: "Reviewer comment",
        });
      } else if (row.job)
        expect(
          await prisma.job.findUnique({
            where: { id: row.job.id },
            select: { id: true },
          }),
        ).not.toBeNull();
    }
    expect(JSON.stringify(rows)).not.toMatch(
      /passwordHash|storageKey|email|actorId|candidateId/,
    );
  });
  it("rejects invalid or unbounded feed limits before querying", async () => {
    const query = vi.spyOn(prisma.activity, "findMany");
    try {
      for (const limit of [0, -1, 11, 1.5, Infinity, NaN, "10", null])
        await expect(getRecentActivity(limit)).rejects.toThrow();
      expect(query).not.toHaveBeenCalled();
    } finally {
      query.mockRestore();
    }
  });
  for (const [role, status] of [
    ["CANDIDATE", 403],
    ["ANONYMOUS", 401],
  ] as const) {
    it(`blocks ${role} before all dashboard database reads`, async () => {
      context.role = role;
      const count = vi.spyOn(prisma.job, "count");
      const activity = vi.spyOn(prisma.activity, "findMany");
      try {
        await expect(getDashboardStats()).rejects.toMatchObject({
          httpStatus: status,
        });
        await expect(getRecentActivity()).rejects.toMatchObject({
          httpStatus: status,
        });
        expect(count).not.toHaveBeenCalled();
        expect(activity).not.toHaveBeenCalled();
      } finally {
        count.mockRestore();
        activity.mockRestore();
      }
    });
  }
});
