import { hash } from "bcryptjs";
import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function seed() {
  if (
    env.NODE_ENV === "production" &&
    (!env.SEED_RECRUITER_EMAIL || !env.SEED_RECRUITER_PASSWORD)
  )
    throw new Error(
      "Production seeding requires both SEED_RECRUITER variables.",
    );
  const recruiterEmail = env.SEED_RECRUITER_EMAIL ?? "recruiter@example.com";
  if (
    [
      "candidate1@example.com",
      "candidate2@example.com",
      "candidate3@example.com",
    ].includes(recruiterEmail)
  )
    throw new Error("Recruiter email conflicts with a demo candidate.");
  const existing = await prisma.user.findUnique({
    where: { email: recruiterEmail },
    select: { role: true },
  });
  if (existing && existing.role !== "RECRUITER")
    throw new Error("Seed recruiter email is already used by a candidate.");
  const passwordHash = await hash(
    env.SEED_RECRUITER_PASSWORD ?? "Demo-password-123",
    12,
  );
  const candidateHash = await hash("Demo-password-123", 12);
  const date = new Date("2026-01-01T09:00:00Z");
  await prisma.$transaction(async (tx) => {
    const recruiter = await tx.user.upsert({
      where: { email: recruiterEmail },
      update: {},
      create: {
        email: recruiterEmail,
        name: "Demo recruiter",
        passwordHash,
        role: "RECRUITER",
        createdAt: date,
      },
    });
    if (recruiter.role !== "RECRUITER")
      throw new Error("Recruiter seed email belongs to a candidate.");
    const candidates = [];
    for (const index of [1, 2, 3])
      candidates.push(
        await tx.user.upsert({
          where: { email: `candidate${index}@example.com` },
          update: {},
          create: {
            email: `candidate${index}@example.com`,
            name: `Demo candidate ${index}`,
            passwordHash: candidateHash,
            role: "CANDIDATE",
            createdAt: date,
          },
        }),
      );
    const jobs = [];
    const definitions = [
      {
        slug: "product-designer",
        title: "Product designer",
        status: "PUBLISHED" as const,
      },
      {
        slug: "software-engineer",
        title: "Software engineer",
        status: "PUBLISHED" as const,
      },
      {
        slug: "operations-specialist",
        title: "Operations specialist",
        status: "DRAFT" as const,
      },
      {
        slug: "people-partner",
        title: "People partner",
        status: "CLOSED" as const,
      },
      {
        slug: "support-specialist",
        title: "Support specialist",
        status: "ARCHIVED" as const,
      },
    ];
    for (const job of definitions)
      jobs.push(
        await tx.job.upsert({
          where: { slug: job.slug },
          update: {},
          create: {
            ...job,
            description: `Join our team as a ${job.title.toLowerCase()}. Work with a small collaborative team.`,
            location: "Jakarta",
            employmentType: "FULL_TIME",
            salaryMin: 10000000,
            salaryMax: 20000000,
            publishedAt: job.status === "DRAFT" ? null : date,
            createdAt: date,
            createdBy: { connect: { id: recruiter.id } },
          },
        }),
      );
    const stages = [
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "OFFERING",
      "HIRED",
      "REJECTED",
    ] as const;
    for (const [index, stage] of stages.entries()) {
      const candidate = candidates[index % 3];
      const job = jobs[Math.floor(index / 3)];
      if (!candidate || !job) throw new Error("Missing seed fixture");
      const cv = await tx.fileObject.upsert({
        where: { storageKey: `cv/demo-${index}.pdf` },
        update: {},
        create: {
          storageKey: `cv/demo-${index}.pdf`,
          originalName: "demo-cv.pdf",
          mimeType: "application/pdf",
          sizeBytes: 0,
          owner: { connect: { id: candidate.id } },
          createdAt: date,
        },
      });
      const application = await tx.application.upsert({
        where: {
          jobId_candidateId: { jobId: job.id, candidateId: candidate.id },
        },
        update: {},
        create: {
          job: { connect: { id: job.id } },
          candidate: { connect: { id: candidate.id } },
          cvFile: { connect: { id: cv.id } },
          stage,
          rejectionReason:
            stage === "REJECTED"
              ? "The role requires a different experience profile."
              : null,
          coverNote: "Demo application for foundation verification.",
          createdAt: date,
          appliedAt: date,
          stageUpdatedAt: date,
        },
      });
      await tx.activity.upsert({
        where: { id: `cseedapplication${index}` },
        update: {},
        create: {
          id: `cseedapplication${index}`,
          type: "APPLICATION_CREATED",
          actor: { connect: { id: candidate.id } },
          job: { connect: { id: job.id } },
          application: { connect: { id: application.id } },
          data: { stage: "APPLIED" },
          createdAt: date,
        },
      });
      if (stage !== "APPLIED")
        await tx.activity.upsert({
          where: { id: `cseedstage${index}` },
          update: {},
          create: {
            id: `cseedstage${index}`,
            type: "STAGE_CHANGED",
            actor: { connect: { id: recruiter.id } },
            job: { connect: { id: job.id } },
            application: { connect: { id: application.id } },
            data: { from: "APPLIED", to: stage },
            createdAt: new Date(date.getTime() + 60000),
          },
        });
      if (stage === "INTERVIEW") {
        await tx.note.upsert({
          where: { id: "cseedinterviewnote" },
          update: {},
          create: {
            id: "cseedinterviewnote",
            application: { connect: { id: application.id } },
            author: { connect: { id: recruiter.id } },
            body: "Discuss portfolio examples during the next interview.",
            createdAt: date,
          },
        });
        await tx.activity.upsert({
          where: { id: "cseednoteactivity" },
          update: {},
          create: {
            id: "cseednoteactivity",
            type: "NOTE_ADDED",
            actor: { connect: { id: recruiter.id } },
            job: { connect: { id: job.id } },
            application: { connect: { id: application.id } },
            data: { noteId: "cseedinterviewnote" },
            createdAt: date,
          },
        });
      }
    }
  });
  logger.info("seed_complete", { count: 5 });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  seed()
    .catch(() => {
      logger.error("seed_failed", { code: "SEED_FAILED" });
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
