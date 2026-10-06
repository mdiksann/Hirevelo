"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireCandidate } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { applySchema } from "@/lib/validation/applications";
import { jobBaseSchema } from "@/lib/validation/jobs";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { handleActionError, type ActionResult } from "@/types/action-result";
export async function submitApplication(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const requestId = crypto.randomUUID();
  try {
    const session = await requireCandidate();
    const values = applySchema.parse(input);
    logger.info("application_submit_started", {
      actorId: session.user.id,
      jobId: values.jobId,
      requestId,
    });
    const result = await prisma.$transaction(
      async (tx) => {
        const job = await tx.job.findUnique({
          where: { id: values.jobId },
          select: {
            id: true,
            slug: true,
            status: true,
            title: true,
            description: true,
            location: true,
          },
        });
        if (!job) throw new NotFoundError();
        if (job.status !== "PUBLISHED")
          throw new ConflictError(
            "This job is no longer accepting applications.",
          );
        jobBaseSchema
          .pick({ title: true, description: true, location: true })
          .parse(job);
        const duplicate = await tx.application.findUnique({
          where: {
            jobId_candidateId: { jobId: job.id, candidateId: session.user.id },
          },
          select: { id: true },
        });
        if (duplicate)
          throw new ConflictError("You have already applied to this job.");
        const file = await tx.fileObject.findUnique({
          where: { id: values.cvFileId },
          select: { ownerId: true, purpose: true },
        });
        if (!file) throw new NotFoundError("Upload your CV before applying.");
        if (file.ownerId !== session.user.id || file.purpose !== "CV")
          throw new ForbiddenError();
        const application = await tx.application.create({
          data: {
            stage: "APPLIED",
            coverNote: values.coverNote,
            job: { connect: { id: job.id } },
            candidate: { connect: { id: session.user.id } },
            cvFile: { connect: { id: values.cvFileId } },
          },
          select: { id: true },
        });
        await tx.activity.create({
          data: {
            type: "APPLICATION_CREATED",
            actor: { connect: { id: session.user.id } },
            application: { connect: { id: application.id } },
            job: { connect: { id: job.id } },
            data: { stage: "APPLIED" },
          },
        });
        return { id: application.id, slug: job.slug };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/applications");
    revalidatePath(`/careers/${result.slug}`);
    revalidatePath(`/careers/${result.slug}/apply`);
    revalidatePath("/recruiter/candidates");
    revalidatePath("/recruiter/jobs");
    logger.info("application_submitted", {
      actorId: session.user.id,
      applicationId: result.id,
      requestId,
    });
    return { ok: true, data: { id: result.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        error = new ConflictError("You have already applied to this job.");
      else if (error.code === "P2034")
        error = new ConflictError(
          "This job or application changed. Please try again.",
        );
    }
    return handleActionError(error, requestId);
  }
}
