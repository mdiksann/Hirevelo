import { requireCandidate } from "@/lib/auth-helpers";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { saveFile, removeFile } from "@/lib/files";
import { uploadSchema } from "@/lib/validation/applications";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { readUpload } from "@/lib/upload";
import { createRateLimiter } from "@/lib/rate-limit";
import { handleActionError } from "@/types/action-result";
import { logger } from "@/lib/logger";
const globalUploads = globalThis as typeof globalThis & {
  cvLimiter?: ReturnType<typeof createRateLimiter>;
};
const limitUpload = (globalUploads.cvLimiter ??= createRateLimiter());
export const runtime = "nodejs";
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let key: string | undefined;
  try {
    const session = await requireCandidate();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(env.AUTH_URL).origin)
      throw new AppError("Invalid upload origin.", "FORBIDDEN", 403);
    limitUpload(session.user.id);
    const data = await readUpload(request);
    const { jobId } = uploadSchema.parse({ jobId: data.get("jobId") });
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (!job) throw new NotFoundError();
    if (job.status !== "PUBLISHED")
      throw new ConflictError("This job is no longer accepting applications.");
    if (
      await prisma.application.findUnique({
        where: { jobId_candidateId: { jobId, candidateId: session.user.id } },
        select: { id: true },
      })
    )
      throw new ConflictError("You have already applied to this job.");
    const file = data.get("file");
    if (!(file instanceof File)) throw new ValidationError("Choose a CV file.");
    const stored = await saveFile(file);
    key = stored.key;
    const row = await prisma.fileObject.create({
      data: {
        owner: { connect: { id: session.user.id } },
        purpose: "CV",
        storageKey: key,
        originalName: file.name.slice(0, 255),
        mimeType: stored.mime,
        sizeBytes: stored.size,
      },
      select: { id: true, originalName: true, sizeBytes: true },
    });
    key = undefined;
    logger.info("cv_uploaded", {
      actorId: session.user.id,
      fileId: row.id,
      requestId,
    });
    return Response.json(
      { fileId: row.id, originalName: row.originalName, size: row.sizeBytes },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (key) {
      try {
        await removeFile(key);
      } catch {
        logger.error("cv_cleanup_failed", { code: "STORAGE_ERROR", requestId });
      }
    }
    const result = handleActionError(error, requestId);
    return Response.json(result, {
      status: result.ok ? 500 : (result.status ?? 500),
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
