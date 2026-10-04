import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; errors?: Record<string, string[]> };
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors = new Map<string, string[]>();
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    const messages = errors.get(path) ?? [];
    messages.push(issue.message);
    errors.set(path, messages);
  }
  return Object.fromEntries(errors);
}
export function handleActionError(
  error: unknown,
  requestId = crypto.randomUUID(),
): ActionResult<never> {
  if (error instanceof z.ZodError) {
    logger.warn("validation_failed", { requestId, code: "VALIDATION_ERROR" });
    return {
      ok: false,
      message: "Please check your input.",
      errors: fieldErrors(error),
    };
  }
  let safe: AppError | undefined;
  if (error instanceof AppError) safe = error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") safe = new ConflictError();
    if (error.code === "P2025") safe = new NotFoundError();
    if (error.code === "P2003")
      safe = new ValidationError(
        "This item is still in use or has an invalid reference.",
      );
  }
  logger.error("action_failed", {
    requestId,
    code: safe?.code ?? "INTERNAL_ERROR",
  });
  return {
    ok: false,
    message: safe?.message ?? "Something went wrong. Please try again.",
  };
}
