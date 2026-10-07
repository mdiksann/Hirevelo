import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { prisma } from "@/lib/db";
import type { Stage } from "@/lib/validation/applications";
const context = vi.hoisted(() => ({ id: "", role: "RECRUITER" }));
vi.mock("@/lib/auth", () => ({
  auth: async () =>
    context.role === "ANONYMOUS"
      ? null
      : { user: { id: context.id, role: context.role } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
import { moveApplicationStage, addNote } from "@/actions/pipeline";
import {
  getApplicationActivity,
  getCandidateActivity,
  getApplicationNotes,
} from "@/lib/queries/activity";
const prefix = `pipeline-${crypto.randomUUID()}`;
let recruiter = "",
  owner = "",
  other = "",
  file = "";
const jobs: string[] = [];
async function fixture(
  stage: Stage = "APPLIED",
  status: "PUBLISHED" | "CLOSED" | "ARCHIVED" = "PUBLISHED",
) {
  const job = await prisma.job.create({
    data: {
      title: prefix,
      description: "Pipeline test vacancy description.",
      location: "Remote",
      slug: `${prefix}-${crypto.randomUUID()}`,
      status,
      createdBy: { connect: { id: recruiter } },
    },
  });
  jobs.push(job.id);
  return prisma.application.create({
    data: {
      stage,
      job: { connect: { id: job.id } },
      candidate: { connect: { id: owner } },
      cvFile: { connect: { id: file } },
    },
  });
}
beforeAll(async () => {
  const users = await Promise.all(
    ["RECRUITER", "CANDIDATE", "CANDIDATE"].map((role, i) =>
      prisma.user.create({
        data: {
          name: `${prefix} person ${i}`,
          email: `${prefix}-${i}@example.com`,
          passwordHash: "unused",
          role: role === "RECRUITER" ? "RECRUITER" : "CANDIDATE",
        },
      }),
    ),
  );
  [recruiter, owner, other] = users.map((u) => u.id) as [
    string,
    string,
    string,
  ];
  file = (
    await prisma.fileObject.create({
      data: {
        owner: { connect: { id: owner } },
        purpose: "CV",
        storageKey: prefix,
        originalName: "cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
      },
    })
  ).id;
});
beforeEach(() => {
  context.id = recruiter;
  context.role = "RECRUITER";
});
afterAll(async () => {
  await prisma.activity.deleteMany({ where: { jobId: { in: jobs } } });
  await prisma.note.deleteMany({
    where: { application: { jobId: { in: jobs } } },
  });
  await prisma.application.deleteMany({ where: { jobId: { in: jobs } } });
  await prisma.job.deleteMany({ where: { id: { in: jobs } } });
  if (file) await prisma.fileObject.delete({ where: { id: file } });
  await prisma.user.deleteMany({
    where: { id: { in: [recruiter, owner, other] } },
  });
  await prisma.$disconnect();
});
describe("stage mutations", () => {
  it("moves forward/backward/on closed jobs with exactly one audited row per move", async () => {
    const app = await fixture("APPLIED", "CLOSED");
    await prisma.application.update({
      where: { id: app.id },
      data: { rejectionReason: "stale reason" },
    });
    const sequence: Stage[] = [
      "SCREENING",
      "INTERVIEW",
      "APPLIED",
      "OFFERING",
      "HIRED",
    ];
    let from: Stage = "APPLIED";
    for (const [i, toStage] of sequence.entries()) {
      expect(
        await moveApplicationStage({
          applicationId: app.id,
          toStage,
          comment: "Internal comment",
        }),
      ).toMatchObject({ ok: true });
      const current = await prisma.application.findUniqueOrThrow({
        where: { id: app.id },
      });
      expect(current.stage).toBe(toStage);
      expect(current.stageUpdatedAt.getTime()).toBeGreaterThanOrEqual(
        app.stageUpdatedAt.getTime(),
      );
      expect(current.rejectionReason).toBeNull();
      const activity = await getApplicationActivity(app.id);
      expect(activity.total).toBe(i + 1);
      expect(activity.items[0]).toMatchObject({
        from,
        to: toStage,
        comment: "Internal comment",
      });
      const audit = await prisma.activity.findFirstOrThrow({
        where: { applicationId: app.id },
        orderBy: { createdAt: "desc" },
      });
      expect(audit.actorId).toBe(recruiter);
      from = toStage;
    }
  });
  for (const [stage, toStage, status] of [
    ["HIRED", "SCREENING", "PUBLISHED"],
    ["REJECTED", "HIRED", "PUBLISHED"],
    ["APPLIED", "APPLIED", "PUBLISHED"],
    ["APPLIED", "SCREENING", "ARCHIVED"],
  ] as const) {
    it(`blocks ${stage} → ${toStage} on ${status} without writes`, async () => {
      const app = await fixture(stage, status);
      expect(
        await moveApplicationStage({ applicationId: app.id, toStage }),
      ).toMatchObject({ ok: false, status: 409 });
      expect(
        await prisma.application.findUnique({ where: { id: app.id } }),
      ).toEqual(app);
      expect(
        await prisma.activity.count({ where: { applicationId: app.id } }),
      ).toBe(0);
    });
  }
  it("returns reason errors and persists a valid rejection reason", async () => {
    const app = await fixture();
    for (const reason of [undefined, "  ", "ab", "x".repeat(501)]) {
      expect(
        await moveApplicationStage({
          applicationId: app.id,
          toStage: "REJECTED",
          reason,
        }),
      ).toMatchObject({
        ok: false,
        status: 400,
        errors: { reason: expect.any(Array) },
      });
    }
    expect(
      await prisma.activity.count({ where: { applicationId: app.id } }),
    ).toBe(0);
    expect(
      await moveApplicationStage({
        applicationId: app.id,
        toStage: "REJECTED",
        reason: " Different experience needed. ",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await prisma.application.findUnique({ where: { id: app.id } }),
    ).toMatchObject({
      stage: "REJECTED",
      rejectionReason: "Different experience needed.",
    });
  });
  it("rolls back stage and note writes if audit insertion fails", async () => {
    const app = await fixture();
    context.id = "clabcdefghij1234567890"; // Missing actor triggers a real FK failure after the stage update.
    expect(
      await moveApplicationStage({
        applicationId: app.id,
        toStage: "INTERVIEW",
      }),
    ).toMatchObject({ ok: false });
    expect(
      await prisma.application.findUnique({ where: { id: app.id } }),
    ).toEqual(app);
    expect(
      await addNote({ applicationId: app.id, body: "Rollback note" }),
    ).toMatchObject({ ok: false });
    expect(await prisma.note.count({ where: { applicationId: app.id } })).toBe(
      0,
    );
    expect(
      await prisma.activity.count({ where: { applicationId: app.id } }),
    ).toBe(0);
  });
  it("concurrent terminal moves create one activity only", async () => {
    const app = await fixture();
    const results = await Promise.all(
      [1, 2].map(() =>
        moveApplicationStage({ applicationId: app.id, toStage: "HIRED" }),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ status: 409 });
    expect(
      await prisma.activity.count({ where: { applicationId: app.id } }),
    ).toBe(1);
  });
});
describe("notes, access, and history", () => {
  it("validates notes; persists body, author, time and activity; blocks archived jobs", async () => {
    const app = await fixture();
    for (const body of ["", "ab", "   ", "x".repeat(2001)])
      expect(await addNote({ applicationId: app.id, body })).toMatchObject({
        ok: false,
        status: 400,
        errors: { body: expect.any(Array) },
      });
    expect(
      await addNote({ applicationId: app.id, body: " Interview went well. " }),
    ).toMatchObject({ ok: true });
    expect((await getApplicationNotes(app.id)).items[0]).toMatchObject({
      body: "Interview went well.",
      author: `${prefix} person 0`,
      createdAt: expect.any(String),
    });
    expect((await getApplicationActivity(app.id)).items).toMatchObject([
      { type: "NOTE_ADDED", actor: `${prefix} person 0` },
    ]);
    const archived = await fixture("APPLIED", "ARCHIVED");
    expect(
      await addNote({ applicationId: archived.id, body: "Cannot add this." }),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      await prisma.note.count({ where: { applicationId: archived.id } }),
    ).toBe(0);
  });
  it("guards both actions and all reads; missing resources return 404", async () => {
    const app = await fixture();
    for (const role of ["CANDIDATE", "ANONYMOUS"]) {
      context.role = role;
      context.id = owner;
      const status = role === "CANDIDATE" ? 403 : 401;
      expect(
        await moveApplicationStage({ applicationId: app.id, toStage: "HIRED" }),
      ).toMatchObject({ ok: false, status });
      expect(
        await addNote({ applicationId: app.id, body: "Unauthorized" }),
      ).toMatchObject({ ok: false, status });
      await expect(getApplicationActivity(app.id)).rejects.toMatchObject({
        httpStatus: status,
      });
      await expect(getApplicationNotes(app.id)).rejects.toMatchObject({
        httpStatus: status,
      });
    }
    context.role = "RECRUITER";
    context.id = recruiter;
    for (const action of [
      moveApplicationStage({
        applicationId: "clabcdefghij1234567890",
        toStage: "HIRED",
      }),
      addNote({
        applicationId: "clabcdefghij1234567890",
        body: "Missing application",
      }),
    ])
      expect(await action).toMatchObject({ ok: false, status: 404 });
    expect(
      await prisma.activity.count({ where: { applicationId: app.id } }),
    ).toBe(0);
  });
  it("orders recruiter history newest first; paginates every entry; candidate projection omits internals", async () => {
    const app = await fixture();
    const dates = ["2026-01-01", "2026-01-02", "2026-01-03"];
    for (const [i, type] of (
      ["APPLICATION_CREATED", "NOTE_ADDED", "STAGE_CHANGED"] as const
    ).entries()) {
      await prisma.activity.create({
        data: {
          type,
          actor: {
            connect: { id: type === "APPLICATION_CREATED" ? owner : recruiter },
          },
          application: { connect: { id: app.id } },
          job: { connect: { id: app.jobId } },
          createdAt: new Date(`${dates[i]}T12:00:00Z`),
          data: {
            from: "APPLIED",
            to: "SCREENING",
            comment: "SECRET COMMENT",
            body: "SECRET NOTE",
            reason: "SECRET REASON",
          },
        },
      });
    }
    expect(
      (await getApplicationActivity(app.id)).items.map((r) => r.type),
    ).toEqual(["STAGE_CHANGED", "NOTE_ADDED", "APPLICATION_CREATED"]);
    const page = await getApplicationActivity(app.id, { page: 2, pageSize: 1 });
    expect(page.total).toBe(3);
    expect(page.items[0]?.type).toBe("NOTE_ADDED");
    context.role = "CANDIDATE";
    context.id = owner;
    const safe = await getCandidateActivity(app.id);
    expect(safe.items.map((r) => r.type)).toEqual([
      "APPLICATION_CREATED",
      "STAGE_CHANGED",
    ]);
    expect(safe.items.map((r) => r.actor)).toEqual(["You", "Recruiter"]);
    expect(JSON.stringify(safe)).not.toMatch(
      /SECRET|person|actorId|noteId|passwordHash/,
    );
    context.id = other;
    await expect(getCandidateActivity(app.id)).rejects.toMatchObject({
      httpStatus: 404,
    });
    context.role = "ANONYMOUS";
    await expect(getCandidateActivity(app.id)).rejects.toMatchObject({
      httpStatus: 401,
    });
    context.role = "RECRUITER";
    await expect(getCandidateActivity(app.id)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });
});
