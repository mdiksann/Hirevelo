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
import { Prisma } from "@prisma/client";
import { seed } from "../../prisma/seed";
import { ForbiddenError, AuthError } from "@/lib/errors";
const context = vi.hoisted(() => ({ role: "RECRUITER", id: "" }));
vi.mock("@/lib/auth", () => ({
  auth: async () =>
    context.role === "ANONYMOUS"
      ? null
      : { user: { id: context.id, role: context.role } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
import {
  createJob,
  updateJob,
  changeJobStatus,
  deleteJob,
} from "@/actions/jobs";
import {
  getJobsForRecruiter,
  getJobForRecruiter,
  getPublishedJobs,
  getJobBySlug,
  hasAppliedToJob,
} from "@/lib/queries/jobs";
const prefix = `jobs-${crypto.randomUUID()}`;
const valid = {
  title: `${prefix} Designer`,
  description: "Design accessible products with a collaborative team.",
  location: "Jakarta",
  employmentType: "FULL_TIME",
};
const ids: string[] = [];
async function create(input: object = {}) {
  const result = await createJob({ ...valid, ...input });
  if (!result.ok) throw new Error(result.message);
  ids.push(result.data.id);
  return result.data;
}
beforeAll(async () => {
  await seed();
  context.id = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "recruiter@example.com" },
      select: { id: true },
    })
  ).id;
});
beforeEach(() => {
  context.role = "RECRUITER";
});
afterAll(async () => {
  await prisma.activity.deleteMany({ where: { jobId: { in: ids } } });
  await prisma.job.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});
describe("job mutations", () => {
  it("creates a draft, updates fields and removes optional salary, keeping the slug stable", async () => {
    const job = await create({ salaryMin: 10, salaryMax: 20 });
    expect(job).toMatchObject({
      status: "DRAFT",
      publishedAt: null,
      applicantsCount: 0,
      salaryMin: 10,
    });
    const result = await updateJob({
      ...valid,
      title: `${prefix} Renamed`,
      id: job.id,
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        slug: job.slug,
        title: `${prefix} Renamed`,
        salaryMin: null,
        salaryMax: null,
      },
    });
    expect(await prisma.activity.count({ where: { jobId: job.id } })).toBe(2);
  });
  it("blocks candidate and anonymous actions and private reads, with no writes", async () => {
    const before = await prisma.job.count();
    context.role = "CANDIDATE";
    expect(await createJob(valid)).toMatchObject({
      ok: false,
      message: new ForbiddenError().message,
    });
    expect(
      await updateJob({ ...valid, id: "clabcdefghij1234567890" }),
    ).toMatchObject({ ok: false });
    expect(
      await changeJobStatus({
        id: "clabcdefghij1234567890",
        status: "PUBLISHED",
      }),
    ).toMatchObject({ ok: false });
    expect(await deleteJob("clabcdefghij1234567890")).toMatchObject({
      ok: false,
    });
    await expect(getJobsForRecruiter()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      getJobForRecruiter("clabcdefghij1234567890"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    context.role = "ANONYMOUS";
    expect(await createJob(valid)).toMatchObject({
      ok: false,
      message: new AuthError().message,
    });
    await expect(getJobsForRecruiter()).rejects.toBeInstanceOf(AuthError);
    expect(await prisma.job.count()).toBe(before);
  });
  it("returns field errors without writing and maps missing jobs safely", async () => {
    const before = await prisma.job.count();
    expect(await createJob({})).toMatchObject({
      ok: false,
      status: 400,
      errors: {
        title: expect.any(Array),
        description: expect.any(Array),
        location: expect.any(Array),
      },
    });
    expect(
      await updateJob({ ...valid, id: "clabcdefghij1234567890" }),
    ).toMatchObject({ ok: false, message: "This item could not be found." });
    expect(
      await changeJobStatus({
        id: "clabcdefghij1234567890",
        status: "PUBLISHED",
      }),
    ).toMatchObject({ ok: false, message: "This item could not be found." });
    expect(await prisma.job.count()).toBe(before);
  });
  it("suffixes slug collisions at the unique constraint", async () => {
    const title = `${prefix} Collision`;
    const a = await create({ title });
    const b = await create({ title });
    expect(b.slug).not.toBe(a.slug);
    expect(b.slug).toMatch(new RegExp(`^${a.slug}-[a-f0-9]{8}$`));
  });
  it("bounds slug retry exhaustion and returns a safe non-unique failure", async () => {
    const before = await prisma.job.count();
    const collision = new Prisma.PrismaClientKnownRequestError(
      "private constraint",
      { code: "P2002", clientVersion: "6" },
    );
    const tx = vi.spyOn(prisma, "$transaction").mockRejectedValue(collision);
    try {
      expect(await createJob(valid)).toMatchObject({
        ok: false,
        status: 409,
        message: "Unable to generate a unique job URL. Please try again.",
      });
      expect(tx).toHaveBeenCalledTimes(5);
      tx.mockClear().mockRejectedValue(new Error("private database details"));
      expect(await createJob(valid)).toEqual({
        ok: false,
        message: "Something went wrong. Please try again.",
      });
      expect(tx).toHaveBeenCalledTimes(1);
    } finally {
      tx.mockRestore();
    }
    expect(await prisma.job.count()).toBe(before);
  });
  it("blocks incomplete publication without activity and permits publish/close/reopen/archive", async () => {
    const job = await create();
    await prisma.job.update({
      where: { id: job.id },
      data: { description: "", location: "" },
    });
    expect(
      await changeJobStatus({ id: job.id, status: "PUBLISHED" }),
    ).toMatchObject({
      ok: false,
      status: 400,
      errors: { description: expect.any(Array), location: expect.any(Array) },
    });
    expect(await prisma.activity.count({ where: { jobId: job.id } })).toBe(1);
    await updateJob({ ...valid, id: job.id });
    for (const status of ["PUBLISHED", "CLOSED", "PUBLISHED", "ARCHIVED"]) {
      expect(await changeJobStatus({ id: job.id, status })).toMatchObject({
        ok: true,
        data: { status },
      });
      expect(Boolean(await getJobBySlug(job.slug))).toBe(
        status === "PUBLISHED",
      );
    }
    const count = await prisma.activity.count({ where: { jobId: job.id } });
    for (const status of ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"])
      expect(await changeJobStatus({ id: job.id, status })).toMatchObject({
        ok: false,
        status: 409,
      });
    expect(await updateJob({ ...valid, id: job.id })).toMatchObject({
      ok: false,
      message: "Archived jobs are read-only.",
    });
    expect(await prisma.activity.count({ where: { jobId: job.id } })).toBe(
      count,
    );
    const history = await prisma.activity.findMany({
      where: {
        jobId: job.id,
        type: { in: ["JOB_PUBLISHED", "JOB_CLOSED", "JOB_ARCHIVED"] },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(
      history.map(({ type, data, actorId }) => ({ type, data, actorId })),
    ).toEqual([
      {
        type: "JOB_PUBLISHED",
        data: { from: "DRAFT", to: "PUBLISHED" },
        actorId: context.id,
      },
      {
        type: "JOB_CLOSED",
        data: { from: "PUBLISHED", to: "CLOSED" },
        actorId: context.id,
      },
      {
        type: "JOB_PUBLISHED",
        data: { from: "CLOSED", to: "PUBLISHED" },
        actorId: context.id,
      },
      {
        type: "JOB_ARCHIVED",
        data: { from: "PUBLISHED", to: "ARCHIVED" },
        actorId: context.id,
      },
    ]);
  });
  it("rolls the status update back if writing history fails", async () => {
    const job = await create();
    const real = prisma.$transaction.bind(prisma);
    const transaction = vi
      .spyOn(prisma, "$transaction")
      .mockImplementationOnce(async (callback) => {
        if (typeof callback !== "function")
          throw new Error("Expected interactive transaction");
        return real(async (tx) => {
          return callback(
            new Proxy(tx, {
              get(target, key) {
                if (key === "activity")
                  return {
                    create: async () => {
                      throw new Error("history failure");
                    },
                  };
                return Reflect.get(target, key);
              },
            }),
          );
        });
      });
    expect(
      await changeJobStatus({ id: job.id, status: "PUBLISHED" }),
    ).toMatchObject({ ok: false });
    transaction.mockRestore();
    expect(await getJobForRecruiter(job.id)).toMatchObject({
      status: "DRAFT",
      publishedAt: null,
    });
    expect(await prisma.activity.count({ where: { jobId: job.id } })).toBe(1);
  });
  it("rejects duplicate concurrent transitions and appends history once", async () => {
    const job = await create();
    const results = await Promise.all([
      changeJobStatus({ id: job.id, status: "PUBLISHED" }),
      changeJobStatus({ id: job.id, status: "PUBLISHED" }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      await prisma.activity.count({
        where: { jobId: job.id, type: "JOB_PUBLISHED" },
      }),
    ).toBe(1);
  });
  it("delete archives and retains the row", async () => {
    const job = await create();
    expect(await deleteJob(job.id)).toMatchObject({
      ok: true,
      data: { status: "ARCHIVED" },
    });
    expect(await prisma.job.count({ where: { id: job.id } })).toBe(1);
  });
});
describe("job queries", () => {
  it("filters title/status, paginates, and returns explicit DTOs", async () => {
    const title = `${prefix} Filter`;
    const a = await create({ title });
    const b = await create({ title });
    const c = await create({ title });
    await changeJobStatus({ id: a.id, status: "PUBLISHED" });
    await changeJobStatus({ id: c.id, status: "ARCHIVED" });
    const all = await getJobsForRecruiter({
      q: title.toUpperCase(),
      pageSize: 2,
    });
    expect(all.total).toBe(3);
    expect(all.items).toHaveLength(2);
    const next = await getJobsForRecruiter({ q: title, pageSize: 2, page: 2 });
    expect(next.items).toHaveLength(1);
    expect(
      new Set([...all.items, ...next.items].map(({ id }) => id)).size,
    ).toBe(3);
    expect(
      (await getJobsForRecruiter({ q: title, status: "DRAFT" })).items.map(
        ({ id }) => id,
      ),
    ).toEqual([b.id]);
    expect((await getJobsForRecruiter({ q: title, page: 999 })).items).toEqual(
      [],
    );
    expect(await getJobsForRecruiter({ q: `${prefix}-missing` })).toMatchObject(
      { total: 0, items: [] },
    );
    expect(Object.keys(all.items[0] ?? {}).sort()).toEqual(
      [
        "id",
        "slug",
        "title",
        "description",
        "location",
        "employmentType",
        "salaryMin",
        "salaryMax",
        "publishedAt",
        "status",
        "updatedAt",
        "applicantsCount",
      ].sort(),
    );
    expect(JSON.stringify(all)).not.toMatch(/passwordHash|createdById|_count/);
    const publicJobs = await getPublishedJobs({ q: title });
    expect(publicJobs.items.map(({ id }) => id)).toEqual([a.id]);
    expect(await getJobBySlug(b.slug)).toBeNull();
    expect(await getJobBySlug(c.slug)).toBeNull();
    expect(await getJobBySlug(`${prefix}-missing`)).toBeNull();
  });
  it("returns existing applicant counts after closing without changing applications", async () => {
    const job = await prisma.job.findFirstOrThrow({
      where: { status: "PUBLISHED", applications: { some: {} } },
    });
    const previous = job.status;
    const before = await prisma.application.count({ where: { jobId: job.id } });
    try {
      expect(
        await changeJobStatus({ id: job.id, status: "CLOSED" }),
      ).toMatchObject({ ok: true, data: { applicantsCount: before } });
      expect(await prisma.application.count({ where: { jobId: job.id } })).toBe(
        before,
      );
      expect(await getJobBySlug(job.slug)).toBeNull();
    } finally {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: previous, publishedAt: job.publishedAt },
      });
      await prisma.activity.deleteMany({
        where: { jobId: job.id, type: "JOB_CLOSED" },
      });
    }
  });
  it("checks duplicate applications for the current candidate only", async () => {
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "candidate1@example.com" },
    });
    const application = await prisma.application.findFirstOrThrow({
      where: { candidateId: owner.id, job: { status: "PUBLISHED" } },
    });
    const recruiter = context.id;
    context.role = "CANDIDATE";
    context.id = owner.id;
    try {
      expect(await hasAppliedToJob(application.jobId)).toBe(true);
      context.id = (
        await prisma.user.findUniqueOrThrow({
          where: { email: "candidate3@example.com" },
        })
      ).id;
      const existing = await prisma.application.count({
        where: { jobId: application.jobId, candidateId: context.id },
      });
      expect(await hasAppliedToJob(application.jobId)).toBe(Boolean(existing));
    } finally {
      context.id = recruiter;
    }
  });
});
