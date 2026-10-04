import "server-only";
import { env } from "@/lib/env";

// HF-006 preview only: never use this stub to authorize reads or mutations.
export async function getSession() {
  return env.NODE_ENV === "production"
    ? null
    : { user: { id: "foundation-preview", role: "RECRUITER" as const } };
}
