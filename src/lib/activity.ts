import { z } from "zod";
import { stages, type Stage } from "@/lib/validation/applications";
export type ActivityType =
  | "APPLICATION_CREATED"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "JOB_CREATED"
  | "JOB_UPDATED"
  | "JOB_PUBLISHED"
  | "JOB_CLOSED"
  | "JOB_ARCHIVED";
export type ActivityDto = {
  id: string;
  type: ActivityType;
  actor: string;
  createdAt: string;
  from: Stage | null;
  to: Stage | null;
  comment: string | null;
};
const dataSchema = z.object({
  from: z.enum(stages).optional(),
  to: z.enum(stages).optional(),
  comment: z.string().nullable().optional(),
});
export function activityDetails(data: unknown) {
  const parsed = dataSchema.safeParse(data);
  return {
    from: parsed.success ? (parsed.data.from ?? null) : null,
    to: parsed.success ? (parsed.data.to ?? null) : null,
    comment: parsed.success ? (parsed.data.comment ?? null) : null,
  };
}
export const jobActivityLabels = {
  JOB_CREATED: "Job created",
  JOB_UPDATED: "Job updated",
  JOB_PUBLISHED: "Job published",
  JOB_CLOSED: "Job closed",
  JOB_ARCHIVED: "Job archived",
};
