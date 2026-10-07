import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
const database =
  process.env.DATABASE_URL_TEST ??
  "postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test";
if (!new URL(database).pathname.endsWith("_test"))
  throw new Error("E2E requires test DB");
export const db = new PrismaClient({ datasourceUrl: database });
export async function publishedJob() {
  return db.job.create({
    data: {
      title: `Journey ${crypto.randomUUID()}`,
      slug: `journey-${crypto.randomUUID()}`,
      description: "Build accessible products with a collaborative team.",
      location: "Remote",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: { connect: { email: "recruiter@example.com" } },
    },
  });
}
export async function applicants(jobId: string) {
  return Promise.all(
    [1, 2].map(async (index) => {
      const user = await db.user.findUniqueOrThrow({
        where: { email: `candidate${index}@example.com` },
      });
      const file = await db.fileObject.create({
        data: {
          owner: { connect: { id: user.id } },
          storageKey: `cv/${crypto.randomUUID()}.pdf`,
          originalName: "sample.pdf",
          mimeType: "application/pdf",
          sizeBytes: 10,
        },
      });
      return db.application.create({
        data: {
          job: { connect: { id: jobId } },
          candidate: { connect: { id: user.id } },
          cvFile: { connect: { id: file.id } },
          activities: {
            create: {
              type: "APPLICATION_CREATED",
              actor: { connect: { id: user.id } },
              job: { connect: { id: jobId } },
              data: { stage: "APPLIED" },
            },
          },
        },
      });
    }),
  );
}
export async function cleanupJob(jobId: string) {
  const apps = await db.application.findMany({
    where: { jobId },
    select: { id: true, cvFileId: true },
  });
  await db.activity.deleteMany({ where: { jobId } });
  await db.note.deleteMany({
    where: { applicationId: { in: apps.map((a) => a.id) } },
  });
  await db.application.deleteMany({ where: { jobId } });
  const files = await db.fileObject.findMany({
    where: { id: { in: apps.map((a) => a.cvFileId) } },
  });
  for (const file of files)
    await unlink(
      resolve(process.env.STORAGE_DIR ?? "./storage/cv", file.storageKey),
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  await db.fileObject.deleteMany({
    where: { id: { in: files.map((f) => f.id) } },
  });
  await db.job.delete({ where: { id: jobId } });
}
