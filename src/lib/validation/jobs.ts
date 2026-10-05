import { z } from "zod";

export const jobStatuses = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
] as const;
export const employmentTypes = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
] as const;
const salary = z.preprocess(
  (value) =>
    value === "" || value === null
      ? undefined
      : typeof value === "string"
        ? Number(value)
        : value,
  z.number().int().positive().max(10_000_000).optional(),
);
export const jobBaseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(20_000),
  location: z.string().trim().min(2).max(120),
  employmentType: z.enum(employmentTypes),
  salaryMin: salary,
  salaryMax: salary,
});
function salaryRange(value: { salaryMin?: number; salaryMax?: number }) {
  return (
    value.salaryMin === undefined ||
    value.salaryMax === undefined ||
    value.salaryMax >= value.salaryMin
  );
}
const rangeError = {
  message: "Max salary must be greater than or equal to min salary",
  path: ["salaryMax"],
};
export const jobCreateSchema = jobBaseSchema.refine(salaryRange, rangeError);
export const jobIdSchema = z.string().cuid();
export const jobUpdateSchema = jobBaseSchema
  .extend({ id: jobIdSchema })
  .refine(salaryRange, rangeError);
export const jobStatusSchema = z.object({
  id: jobIdSchema,
  status: z.enum(jobStatuses),
});
const listNumber = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().finite().optional(),
);
export const jobListQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  status: z.enum(jobStatuses).optional(),
  page: listNumber,
  pageSize: listNumber,
});
export const jobSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type JobInput = z.infer<typeof jobCreateSchema>;
export type JobStatus = (typeof jobStatuses)[number];
export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120)
      .replace(/-+$/g, "") || "job"
  );
}
