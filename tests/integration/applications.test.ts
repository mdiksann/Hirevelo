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
import { readFile, removeFile } from "@/lib/files";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "@/lib/env";
const context = vi.hoisted(() => ({ role: "CANDIDATE", id: "" }));
vi.mock("@/lib/auth", () => ({
  auth: async () =>
    context.role === "ANONYMOUS"
      ? null
      : { user: { id: context.id, role: context.role } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { submitApplication } from "@/actions/applications";
import { POST } from "@/app/api/uploads/cv/route";
import { GET } from "@/app/api/files/[id]/route";
import {
  getMyApplications,
  getMyApplication,
  searchApplications,
  getApplicationForRecruiter,
} from "@/lib/queries/applications";
const prefix = `applications-${crypto.randomUUID()}`;
let recruiter = "",
  owner = "",
  other = "";
const jobIds: string[] = [];
const fileIds: string[] = [];
const keys: string[] = [];
async function job(
  status: "PUBLISHED" | "DRAFT" | "CLOSED" | "ARCHIVED" = "PUBLISHED",
) {
  const row = await prisma.job.create({
    data: {
      title: prefix,
      description: "A valid description for application tests.",
      location: "Jakarta",
      slug: `${prefix}-${crypto.randomUUID()}`,
      status,
      createdBy: { connect: { id: recruiter } },
    },
  });
  jobIds.push(row.id);
  return row;
}
async function upload(
  jobId: string,
  name = "cv.pdf",
  type = "application/pdf",
  bytes = 12,
) {
  const body = new FormData();
  body.set("jobId", jobId);
  body.set("file", new File([new Uint8Array(bytes)], name, { type }));
  const encoded = new Request("http://localhost/api/uploads/cv", {
    method: "POST",
    body,
  });
  return POST(
    new Request(encoded.url, {
      method: "POST",
      headers: encoded.headers,
      body: await encoded.arrayBuffer(),
    }),
  );
}
async function cv(jobId: string) {
  const response = await upload(jobId);
  expect(response.status).toBe(201);
  const value = await response.json();
  fileIds.push(value.fileId);
  const row = await prisma.fileObject.findUniqueOrThrow({
    where: { id: value.fileId },
  });
  keys.push(row.storageKey);
  return row.id;
}
async function apply() {
  const row = await job();
  const cvFileId = await cv(row.id);
  const result = await submitApplication({
    jobId: row.id,
    cvFileId,
    coverNote: "Please consider my application.",
  });
  if (!result.ok) throw new Error(result.message);
  return { id: result.data.id, jobId: row.id, cvFileId };
}
beforeAll(async () => {
  const users = await Promise.all(
    ["RECRUITER", "CANDIDATE", "CANDIDATE"].map((role, index) =>
      prisma.user.create({
        data: {
          name: `${prefix} Person ${index}`,
          email: `${prefix}-${index}@example.com`,
          passwordHash: "unused",
          role: role === "RECRUITER" ? "RECRUITER" : "CANDIDATE",
        },
      }),
    ),
  );
  recruiter = users[0]?.id ?? "";
  owner = users[1]?.id ?? "";
  other = users[2]?.id ?? "";
});
let tick = Date.now();
beforeEach(() => {
  tick += 16 * 60 * 1000;
  context.role = "CANDIDATE";
  context.id = owner;
  vi.restoreAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(tick);
});
afterAll(async () => {
  await prisma.activity.deleteMany({ where: { jobId: { in: jobIds } } });
  await prisma.application.deleteMany({ where: { jobId: { in: jobIds } } });
  await prisma.fileObject.deleteMany({
    where: { ownerId: { in: [owner, other] } },
  });
  await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
  await prisma.user.deleteMany({
    where: { id: { in: [owner, other, recruiter] } },
  });
  for (const key of keys) await removeFile(key);
  await prisma.$disconnect();
});
describe("application submission", () => {
  it("creates Applied plus activity atomically and rejects duplicate/concurrent submissions", async () => {
    const item = await apply();
    expect(
      await prisma.application.findUnique({ where: { id: item.id } }),
    ).toMatchObject({
      stage: "APPLIED",
      candidateId: owner,
      cvFileId: item.cvFileId,
    });
    expect(
      await prisma.activity.findMany({ where: { applicationId: item.id } }),
    ).toMatchObject([
      { type: "APPLICATION_CREATED", actorId: owner, jobId: item.jobId },
    ]);
    expect(await submitApplication(item)).toMatchObject({
      ok: false,
      status: 409,
      message: "You have already applied to this job.",
    });
    const row = await job();
    const results = await Promise.all([
      submitApplication({ jobId: row.id, cvFileId: item.cvFileId }),
      submitApplication({ jobId: row.id, cvFileId: item.cvFileId }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toMatchObject([{ status: 409 }]);
    expect(await prisma.application.count({ where: { jobId: row.id } })).toBe(
      1,
    );
    expect(await prisma.activity.count({ where: { jobId: row.id } })).toBe(1);
  });
  it("blocks non-published jobs, foreign files, invalid inputs and roles", async () => {
    const open = await job();
    const cvFileId = await cv(open.id);
    for (const status of ["DRAFT", "CLOSED", "ARCHIVED"] as const) {
      const row = await job(status);
      expect(
        await submitApplication({ jobId: row.id, cvFileId }),
      ).toMatchObject({ ok: false, status: 409 });
    }
    context.id = other;
    expect(await submitApplication({ jobId: open.id, cvFileId })).toMatchObject(
      { ok: false, status: 403 },
    );
    context.role = "RECRUITER";
    context.id = recruiter;
    expect(await submitApplication({ jobId: open.id, cvFileId })).toMatchObject(
      { ok: false, status: 403 },
    );
    context.role = "ANONYMOUS";
    expect(await submitApplication({})).toMatchObject({
      ok: false,
      status: 401,
    });
    context.role = "CANDIDATE";
    context.id = owner;
    expect(
      await submitApplication({
        jobId: open.id,
        cvFileId,
        coverNote: "x".repeat(2001),
      }),
    ).toMatchObject({
      ok: false,
      status: 400,
      errors: { coverNote: expect.any(Array) },
    });
    await prisma.job.update({
      where: { id: open.id },
      data: { status: "CLOSED" },
    });
    expect(await submitApplication({ jobId: open.id, cvFileId })).toMatchObject(
      { ok: false, status: 409 },
    );
    expect(await prisma.application.count({ where: { jobId: open.id } })).toBe(
      0,
    );
  });
  it("rolls application back when history fails", async () => {
    const row = await job();
    const cvFileId = await cv(row.id);
    const real = prisma.$transaction.bind(prisma);
    vi.spyOn(prisma, "$transaction").mockImplementationOnce(
      async (callback) => {
        if (typeof callback !== "function")
          throw new Error("Expected transaction");
        return real((tx) =>
          callback(
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
          ),
        );
      },
    );
    expect(await submitApplication({ jobId: row.id, cvFileId })).toMatchObject({
      ok: false,
    });
    expect(await prisma.application.count({ where: { jobId: row.id } })).toBe(
      0,
    );
    expect(await prisma.activity.count({ where: { jobId: row.id } })).toBe(0);
  });
});
describe("CV handlers", () => {
  it("rejects 6 MB and mismatched extension without persisting rows or files", async () => {
    const row = await job();
    const before = await prisma.fileObject.count();
    const dir = resolve(env.STORAGE_DIR, "cv");
    const files = await readdir(dir).catch(() => []);
    expect(
      (await upload(row.id, "big.pdf", "application/pdf", 6 * 1024 * 1024))
        .status,
    ).toBe(413);
    expect((await upload(row.id, "evil.exe", "application/pdf")).status).toBe(
      415,
    );
    expect(await prisma.fileObject.count()).toBe(before);
    expect(await readdir(dir).catch(() => [])).toEqual(files);
  });
  it("authenticates uploads and checks publication/duplicates", async () => {
    const row = await job();
    context.role = "ANONYMOUS";
    expect((await upload(row.id)).status).toBe(401);
    context.role = "RECRUITER";
    expect((await upload(row.id)).status).toBe(403);
    context.role = "CANDIDATE";
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads/cv", {
            method: "POST",
            headers: { origin: "https://foreign.example" },
          }),
        )
      ).status,
    ).toBe(403);
    const closed = await job("CLOSED");
    expect((await upload(closed.id)).status).toBe(409);
    const item = await apply();
    expect((await upload(item.jobId)).status).toBe(409);
  });
  it("downloads for owner and recruiter, blocks foreign/anonymous, and sanitizes attachment names", async () => {
    const row = await job();
    const response = await upload(row.id, '../folder\\cv".pdf');
    expect(response.status).toBe(201);
    const { fileId } = await response.json();
    fileIds.push(fileId);
    const stored = await prisma.fileObject.findUniqueOrThrow({
      where: { id: fileId },
    });
    keys.push(stored.storageKey);
    expect(stored.storageKey).toMatch(/^cv\/c[a-f0-9]{24}\.pdf$/);
    const download = () =>
      GET(new Request(`http://localhost/api/files/${fileId}`), {
        params: Promise.resolve({ id: fileId }),
      });
    const own = await download();
    expect(own.status).toBe(200);
    expect(own.headers.get("content-disposition")).toMatch(
      /^attachment; filename="[^/\\]*"$/,
    );
    expect(own.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await own.arrayBuffer())).toEqual(
      await readFile(stored.storageKey),
    );
    context.id = other;
    expect((await download()).status).toBe(403);
    context.role = "RECRUITER";
    context.id = recruiter;
    expect((await download()).status).toBe(200);
    context.role = "ANONYMOUS";
    expect((await download()).status).toBe(401);
    context.role = "CANDIDATE";
    context.id = owner;
    expect(
      (
        await GET(new Request("http://localhost"), {
          params: Promise.resolve({ id: "clabcdefghij1234567890" }),
        })
      ).status,
    ).toBe(404);
  });
  it("cleans disk when metadata persistence fails", async () => {
    const row = await job();
    const before = await readdir(resolve(env.STORAGE_DIR, "cv"));
    vi.spyOn(prisma.fileObject, "create").mockRejectedValueOnce(
      new Error("metadata failure"),
    );
    expect((await upload(row.id)).status).toBe(500);
    expect(await readdir(resolve(env.STORAGE_DIR, "cv"))).toEqual(before);
  });
  it("limits upload attempts by authenticated candidate", async () => {
    context.id = other;
    for (let n = 0; n < 10; n++)
      expect(
        (
          await POST(
            new Request("http://localhost/api/uploads/cv", { method: "POST" }),
          )
        ).status,
      ).toBe(400);
    expect(
      (
        await POST(
          new Request("http://localhost/api/uploads/cv", { method: "POST" }),
        )
      ).status,
    ).toBe(429);
  });
});
describe("application queries", () => {
  it("scopes candidate lists/details and keeps notes/history/credentials private", async () => {
    const a = await apply();
    context.id = other;
    // Direct fixture avoids exhausting upload limiter across independent cases.
    const b = await prisma.application.create({
      data: {
        job: { connect: { id: a.jobId } },
        candidate: { connect: { id: other } },
        cvFile: { connect: { id: a.cvFileId } },
      },
    });
    const mine = await getMyApplications({ candidateId: owner });
    expect(mine.items.map((r) => r.id)).toEqual([b.id]);
    expect(await getMyApplication(a.id)).toBeNull();
    context.id = owner;
    await prisma.application.update({
      where: { id: a.id },
      data: {
        stage: "REJECTED",
        rejectionReason: "Different experience required.",
      },
    });
    expect(await getMyApplication(a.id)).toMatchObject({
      stage: "REJECTED",
      rejectionReason: "Different experience required.",
    });
    expect(JSON.stringify(await getMyApplication(a.id))).not.toMatch(
      /passwordHash|candidateId|activities|notes/,
    );
    context.role = "RECRUITER";
    await expect(getMyApplications()).rejects.toMatchObject({
      httpStatus: 403,
    });
    context.role = "ANONYMOUS";
    await expect(getMyApplications()).rejects.toMatchObject({
      httpStatus: 401,
    });
  });
  it("searches name/email case-insensitively, ANDs filters and orders tied dates by id", async () => {
    const a = await apply();
    const b = await apply();
    const c = await apply();
    const appliedAt = new Date("2026-10-05T12:00:00Z");
    await prisma.application.updateMany({
      where: { id: { in: [a.id, b.id, c.id] } },
      data: { appliedAt, stage: "SCREENING" },
    });
    // Keep history ordering independent of the database clock and test run date.
    await prisma.activity.updateMany({
      where: { applicationId: { in: [a.id, b.id, c.id] } },
      data: { createdAt: appliedAt },
    });
    await prisma.activity.create({
      data: {
        type: "NOTE_ADDED",
        actor: { connect: { id: recruiter } },
        application: { connect: { id: a.id } },
        job: { connect: { id: a.jobId } },
        createdAt: new Date("2026-10-06T12:00:00Z"),
      },
    });
    context.role = "RECRUITER";
    context.id = recruiter;
    expect(
      (await searchApplications({ q: `${prefix}-1@EXAMPLE.COM` })).total,
    ).toBeGreaterThanOrEqual(3);
    const all = await searchApplications({
      q: `${prefix.toUpperCase()} PERSON 1`,
      stage: "SCREENING",
      dateFrom: "2026-10-05",
      dateTo: "2026-10-05",
      pageSize: 2,
    });
    expect(all.total).toBe(3);
    expect(all.items.map((r) => r.id)).toEqual(
      [a.id, b.id, c.id].sort().reverse().slice(0, 2),
    );
    const next = await searchApplications({
      q: prefix,
      stage: "SCREENING",
      dateFrom: "2026-10-05",
      dateTo: "2026-10-05",
      pageSize: 2,
      page: 2,
    });
    expect(next.items.map((r) => r.id)).toEqual(
      [a.id, b.id, c.id].sort().reverse().slice(2),
    );
    expect(
      (
        await searchApplications({
          q: prefix,
          jobId: a.jobId,
          stage: "SCREENING",
          dateFrom: "2026-10-05",
          dateTo: "2026-10-05",
        })
      ).items.map((r) => r.id),
    ).toEqual([a.id]);
    for (const filter of [
      { q: "unmatched-unique" },
      { stage: "HIRED" },
      { dateFrom: "2027-01-01" },
      { dateTo: "2025-01-01" },
    ])
      expect(
        (await searchApplications({ q: prefix, ...filter })).items,
      ).toEqual([]);
    expect(await getApplicationForRecruiter(a.id)).toMatchObject({
      candidate: { id: owner },
      lastActivityAt: "2026-10-06T12:00:00.000Z",
    });
    expect(JSON.stringify(all)).not.toMatch(/passwordHash|storageKey/);
    expect(
      await getApplicationForRecruiter("clabcdefghij1234567890"),
    ).toBeNull();
    context.role = "CANDIDATE";
    await expect(searchApplications()).rejects.toMatchObject({
      httpStatus: 403,
    });
    await expect(getApplicationForRecruiter(a.id)).rejects.toMatchObject({
      httpStatus: 403,
    });
    context.role = "ANONYMOUS";
    await expect(getApplicationForRecruiter(a.id)).rejects.toMatchObject({
      httpStatus: 401,
    });
  });
});
