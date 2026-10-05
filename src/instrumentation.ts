import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
    const { bootstrapRecruiter } = await import("@/lib/bootstrap");
    await bootstrapRecruiter();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  request,
) => {
  const { logger } = await import("@/lib/logger");
  const header = request.headers["x-request-id"];
  logger.error("request_failed", {
    requestId: typeof header === "string" ? header : crypto.randomUUID(),
    code: "INTERNAL_ERROR",
  });
};
