"use server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireRecruiter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { validateTransition } from "@/lib/pipeline";
import { moveStageSchema, noteSchema } from "@/lib/validation/pipeline";
import { logger } from "@/lib/logger";
import { handleActionError, type ActionResult } from "@/types/action-result";
function revalidate(id: string, jobId: string) {
  for (const path of [
    `/recruiter/candidates/${id}`,
    "/recruiter/candidates",
    "/recruiter",
    "/recruiter/dashboard",
    `/recruiter/jobs/${jobId}`,
    "/recruiter/jobs",
    `/applications/${id}`,
    "/applications",
  ])
    revalidatePath(path);
}
function conflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
    ? new ConflictError("This application or job changed. Please try again.")
    : error;
}
export async function moveApplicationStage(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let requestId = crypto.randomUUID();
  try {
    const session = await requireRecruiter();
    requestId = (await headers()).get("x-request-id") ?? requestId;
    const v = moveStageSchema.parse(input);
    logger.info("stage_move_started", {
      actorId: session.user.id,
      applicationId: v.applicationId,
      requestId,
    });
    const row = await prisma.$transaction(
      async (tx) => {
        const current = await tx.application.findUnique({
          where: { id: v.applicationId },
          select: {
            stage: true,
            stageUpdatedAt: true,
            jobId: true,
            job: { select: { status: true } },
          },
        });
        if (!current) throw new NotFoundError();
        const check = validateTransition(current.stage, v.toStage, {
          jobArchived: current.job.status === "ARCHIVED",
        });
        if (!check.ok) throw new ConflictError(check.message);
        const changed = await tx.application.updateMany({
          where: {
            id: v.applicationId,
            stage: current.stage,
            stageUpdatedAt: current.stageUpdatedAt,
          },
          data: {
            stage: v.toStage,
            stageUpdatedAt: new Date(),
            rejectionReason: v.toStage === "REJECTED" ? v.reason : null,
          },
        });
        if (!changed.count)
          throw new ConflictError(
            "This application changed. Please try again.",
          );
        await tx.activity.create({
          data: {
            type: "STAGE_CHANGED",
            actor: { connect: { id: session.user.id } },
            application: { connect: { id: v.applicationId } },
            job: { connect: { id: current.jobId } },
            data: {
              from: current.stage,
              to: v.toStage,
              comment: v.comment ?? null,
            },
          },
        });
        return current;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidate(v.applicationId, row.jobId);
    logger.info("stage_moved", {
      actorId: session.user.id,
      applicationId: v.applicationId,
      requestId,
    });
    return { ok: true, data: { id: v.applicationId } };
  } catch (error) {
    return handleActionError(conflict(error), requestId);
  }
}
export async function addNote(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  let requestId = crypto.randomUUID();
  try {
    const session = await requireRecruiter();
    requestId = (await headers()).get("x-request-id") ?? requestId;
    const v = noteSchema.parse(input);
    logger.info("note_add_started", {
      actorId: session.user.id,
      applicationId: v.applicationId,
      requestId,
    });
    const result = await prisma.$transaction(
      async (tx) => {
        const app = await tx.application.findUnique({
          where: { id: v.applicationId },
          select: { jobId: true, job: { select: { status: true } } },
        });
        if (!app) throw new NotFoundError();
        if (app.job.status === "ARCHIVED")
          throw new ConflictError("Archived jobs are read-only.");
        const note = await tx.note.create({
          data: {
            application: { connect: { id: v.applicationId } },
            author: { connect: { id: session.user.id } },
            body: v.body,
          },
          select: { id: true },
        });
        await tx.activity.create({
          data: {
            type: "NOTE_ADDED",
            actor: { connect: { id: session.user.id } },
            application: { connect: { id: v.applicationId } },
            job: { connect: { id: app.jobId } },
            data: { noteId: note.id },
          },
        });
        return { id: note.id, jobId: app.jobId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidate(v.applicationId, result.jobId);
    logger.info("note_added", {
      actorId: session.user.id,
      applicationId: v.applicationId,
      requestId,
    });
    return { ok: true, data: { id: result.id } };
  } catch (error) {
    return handleActionError(conflict(error), requestId);
  }
}
