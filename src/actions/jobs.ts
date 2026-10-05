"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireRecruiter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { canTransition } from "@/lib/jobs";
import { logger } from "@/lib/logger";
import {
  jobCreateSchema,
  jobBaseSchema,
  jobUpdateSchema,
  jobStatusSchema,
  jobIdSchema,
  slugify,
} from "@/lib/validation/jobs";
import {
  jobSelect,
  toRecruiterJobDto,
  type RecruiterJobDto,
} from "@/lib/queries/jobs";
import { handleActionError, type ActionResult } from "@/types/action-result";

function revalidate(job: RecruiterJobDto) {
  revalidatePath("/recruiter/jobs");
  revalidatePath(`/recruiter/jobs/${job.id}`);
  revalidatePath(`/recruiter/jobs/${job.id}/edit`);
  revalidatePath("/careers");
  revalidatePath(`/careers/${job.slug}`);
}
export async function createJob(
  input: unknown,
): Promise<ActionResult<RecruiterJobDto>> {
  let requestId = crypto.randomUUID();
  try {
    const session = await requireRecruiter();
    requestId = (await headers()).get("x-request-id") ?? requestId;
    const values = jobCreateSchema.parse(input);
    logger.info("job_create_started", { actorId: session.user.id, requestId });
    const base = slugify(values.title);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const job = await prisma.$transaction(async (tx) => {
          const row = await tx.job.create({
            data: {
              ...values,
              slug:
                attempt === 0
                  ? base
                  : `${base}-${crypto.randomUUID().slice(0, 8)}`,
              createdBy: { connect: { id: session.user.id } },
            },
            select: jobSelect,
          });
          await tx.activity.create({
            data: {
              type: "JOB_CREATED",
              actor: { connect: { id: session.user.id } },
              job: { connect: { id: row.id } },
            },
          });
          return toRecruiterJobDto(row);
        });
        revalidate(job);
        logger.info("job_created", {
          actorId: session.user.id,
          jobId: job.id,
          requestId,
        });
        return { ok: true, data: job };
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ))
          throw error;
      }
    }
    throw new ConflictError(
      "Unable to generate a unique job URL. Please try again.",
    );
  } catch (error) {
    return handleActionError(error, requestId);
  }
}
export async function updateJob(
  input: unknown,
): Promise<ActionResult<RecruiterJobDto>> {
  let requestId = crypto.randomUUID();
  try {
    const session = await requireRecruiter();
    requestId = (await headers()).get("x-request-id") ?? requestId;
    const { id, ...values } = jobUpdateSchema.parse(input);
    logger.info("job_update_started", {
      actorId: session.user.id,
      jobId: id,
      requestId,
    });
    const job = await prisma.$transaction(async (tx) => {
      const current = await tx.job.findUnique({
        where: { id },
        select: jobSelect,
      });
      if (!current) throw new NotFoundError();
      if (current.status === "ARCHIVED")
        throw new ConflictError("Archived jobs are read-only.");
      const changed = await tx.job.updateMany({
        where: { id, updatedAt: current.updatedAt, status: current.status },
        data: {
          ...values,
          salaryMin: values.salaryMin ?? null,
          salaryMax: values.salaryMax ?? null,
        },
      });
      if (!changed.count)
        throw new ConflictError("This job changed. Reload and try again.");
      await tx.activity.create({
        data: {
          type: "JOB_UPDATED",
          actor: { connect: { id: session.user.id } },
          job: { connect: { id } },
        },
      });
      return toRecruiterJobDto(
        await tx.job.findUniqueOrThrow({ where: { id }, select: jobSelect }),
      );
    });
    revalidate(job);
    logger.info("job_updated", {
      actorId: session.user.id,
      jobId: id,
      requestId,
    });
    return { ok: true, data: job };
  } catch (error) {
    return handleActionError(error, requestId);
  }
}
export async function changeJobStatus(
  input: unknown,
): Promise<ActionResult<RecruiterJobDto>> {
  let requestId = crypto.randomUUID();
  try {
    const session = await requireRecruiter();
    requestId = (await headers()).get("x-request-id") ?? requestId;
    const { id, status } = jobStatusSchema.parse(input);
    logger.info("job_transition_started", {
      actorId: session.user.id,
      jobId: id,
      requestId,
    });
    const job = await prisma.$transaction(async (tx) => {
      const current = await tx.job.findUnique({
        where: { id },
        select: jobSelect,
      });
      if (!current) throw new NotFoundError();
      if (!canTransition(current.status, status))
        throw new ConflictError(
          `Cannot move a ${current.status.toLowerCase()} job to ${status.toLowerCase()}.`,
        );
      if (status === "PUBLISHED")
        jobBaseSchema
          .pick({ title: true, description: true, location: true })
          .parse(current);
      const changed = await tx.job.updateMany({
        where: { id, status: current.status, updatedAt: current.updatedAt },
        data: {
          status,
          ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        },
      });
      if (!changed.count)
        throw new ConflictError("This job changed. Reload and try again.");
      const type =
        status === "PUBLISHED"
          ? "JOB_PUBLISHED"
          : status === "CLOSED"
            ? "JOB_CLOSED"
            : "JOB_ARCHIVED";
      await tx.activity.create({
        data: {
          type,
          actor: { connect: { id: session.user.id } },
          job: { connect: { id } },
          data: { from: current.status, to: status },
        },
      });
      return toRecruiterJobDto(
        await tx.job.findUniqueOrThrow({ where: { id }, select: jobSelect }),
      );
    });
    revalidate(job);
    logger.info("job_transitioned", {
      actorId: session.user.id,
      jobId: id,
      requestId,
    });
    return { ok: true, data: job };
  } catch (error) {
    return handleActionError(error, requestId);
  }
}
// Removal preserves the vacancy, applications, and audit history by archiving it.
export async function deleteJob(
  input: unknown,
): Promise<ActionResult<RecruiterJobDto>> {
  const requestId = crypto.randomUUID();
  try {
    await requireRecruiter();
    const id = jobIdSchema.parse(input);
    return await changeJobStatus({ id, status: "ARCHIVED" });
  } catch (error) {
    return handleActionError(error, requestId);
  }
}
