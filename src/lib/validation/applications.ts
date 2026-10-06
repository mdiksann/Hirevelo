import { z } from "zod";
import { jobIdSchema, jobListQuerySchema } from "@/lib/validation/jobs";
export const stages = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFERING",
  "HIRED",
  "REJECTED",
] as const;
export type Stage = (typeof stages)[number];
export const applySchema = z.object({
  jobId: jobIdSchema,
  cvFileId: jobIdSchema,
  coverNote: z.string().max(2000).trim().optional(),
});
export type ApplyInput = z.infer<typeof applySchema>;
export const uploadSchema = z.object({ jobId: jobIdSchema });
export const applicationIdSchema = jobIdSchema;
const date = z.string().date().optional();
export const applicationListSchema = jobListQuerySchema
  .pick({ q: true, page: true, pageSize: true })
  .extend({
    jobId: jobIdSchema.optional(),
    stage: z.enum(stages).optional(),
    jobPage: jobListQuerySchema.shape.page,
    dateFrom: date,
    dateTo: date,
  })
  .refine((v) => !v.dateFrom || !v.dateTo || v.dateFrom <= v.dateTo, {
    path: ["dateTo"],
    message: "End date must be on or after start date.",
  });
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const cvTypes = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
export function cvValidation(file: {
  name: string;
  type: string;
  size: number;
}) {
  if (file.size > MAX_CV_BYTES)
    return { status: 413, message: "CV must be 5 MB or smaller." };
  if (!file.size)
    return { status: 400, message: "Choose a non-empty CV file." };
  const ext = file.name.split(".").at(-1)?.toLowerCase();
  if (
    !Object.entries(cvTypes).some(
      ([extension, mime]) => extension === ext && mime === file.type,
    )
  )
    return {
      status: 415,
      message: "Choose a PDF, DOC, or DOCX with a matching file type.",
    };
  return null;
}
export function sanitizeFilename(name: string) {
  return (
    name
      .replace(/[\\/"\x00-\x1f\x7f]/g, "")
      .replace(/[^\x20-\x7e]/g, "_")
      .trim()
      .slice(0, 180) || "cv"
  );
}
