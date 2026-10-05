import "server-only";
import { auth } from "@/lib/auth";
import { AuthError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    logger.warn("auth_required", {
      code: "UNAUTHENTICATED",
      requestId: crypto.randomUUID(),
    });
    throw new AuthError();
  }
  return session;
}
export async function requireRecruiter() {
  const session = await requireSession();
  if (session.user.role !== "RECRUITER") deny(session.user.id);
  return session;
}
export async function requireCandidate() {
  const session = await requireSession();
  if (session.user.role !== "CANDIDATE") deny(session.user.id);
  return session;
}
export async function requireOwnership(resourceOwnerId: string) {
  const session = await requireSession();
  if (session.user.role !== "RECRUITER" && session.user.id !== resourceOwnerId)
    deny(session.user.id);
  return session;
}
function deny(actorId: string): never {
  logger.warn("auth_forbidden", {
    actorId,
    code: "FORBIDDEN",
    requestId: crypto.randomUUID(),
  });
  throw new ForbiddenError();
}
