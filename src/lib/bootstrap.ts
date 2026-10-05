import "server-only";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hasRecruiter } from "@/lib/queries/auth";
import { logger } from "@/lib/logger";

export function bootstrapDecision(
  production: boolean,
  exists: boolean,
  configured: boolean,
) {
  if (!production || exists) return "skip";
  return configured ? "create" : "warn";
}
export async function bootstrapRecruiter() {
  if (env.NODE_ENV !== "production") return;
  const decision = bootstrapDecision(
    true,
    await hasRecruiter(),
    Boolean(env.SEED_RECRUITER_EMAIL && env.SEED_RECRUITER_PASSWORD),
  );
  if (decision === "warn") {
    logger.warn(
      "production_boot_no_recruiter_set_seed_recruiter_email_and_password",
      { code: "RECRUITER_MISSING", requestId: crypto.randomUUID() },
    );
    return;
  }
  if (
    decision === "create" &&
    env.SEED_RECRUITER_EMAIL &&
    env.SEED_RECRUITER_PASSWORD
  ) {
    const user = await prisma.user.upsert({
      where: { email: env.SEED_RECRUITER_EMAIL },
      update: {},
      create: {
        email: env.SEED_RECRUITER_EMAIL,
        name: "Recruiter",
        passwordHash: await hash(env.SEED_RECRUITER_PASSWORD, 12),
        role: "RECRUITER",
      },
      select: { id: true, role: true },
    });
    logger[user.role === "RECRUITER" ? "info" : "warn"]("recruiter_bootstrap", {
      actorId: user.id,
      code:
        user.role === "RECRUITER"
          ? "RECRUITER_READY"
          : "RECRUITER_EMAIL_IN_USE",
      requestId: crypto.randomUUID(),
    });
  }
}
