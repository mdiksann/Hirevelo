import "server-only";
import { env } from "@/lib/env";

type Level = "debug" | "info" | "warn" | "error";
const priority: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
// Allow metadata identifiers only; callers cannot accidentally log tokens, bodies, or PII.
const allowedKeys = new Set([
  "requestId",
  "code",
  "actorId",
  "jobId",
  "applicationId",
  "fileId",
  "count",
  "digest",
]);
export function log(
  level: Level,
  event: string,
  metadata: Record<string, unknown> = {},
) {
  if (priority[level] < priority[env.LOG_LEVEL]) return;
  const safe = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        allowedKeys.has(key) &&
        ["string", "number", "boolean"].includes(typeof value),
    ),
  );
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event: /^[a-z0-9_]+$/.test(event) ? event : "application_event",
      ...safe,
    }),
  );
}
export const logger = {
  debug: (event: string, metadata?: Record<string, unknown>) =>
    log("debug", event, metadata),
  info: (event: string, metadata?: Record<string, unknown>) =>
    log("info", event, metadata),
  warn: (event: string, metadata?: Record<string, unknown>) =>
    log("warn", event, metadata),
  error: (event: string, metadata?: Record<string, unknown>) =>
    log("error", event, metadata),
};
