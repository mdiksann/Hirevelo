import "server-only";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { applicationIdSchema } from "@/lib/validation/applications";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
export async function getFileForDownload(input: unknown) {
  const session = await requireSession();
  const id = applicationIdSchema.parse(input);
  const file = await prisma.fileObject.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      storageKey: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
    },
  });
  if (!file) throw new NotFoundError();
  if (session.user.role !== "RECRUITER" && session.user.id !== file.ownerId)
    throw new ForbiddenError();
  return file;
}
