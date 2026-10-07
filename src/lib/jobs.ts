import { createTranslator, type Locale } from "@/lib/i18n";
import type { JobStatus } from "@/lib/validation/jobs";
export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["CLOSED", "ARCHIVED"],
  CLOSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};
export function canTransition(from: JobStatus, to: JobStatus) {
  return JOB_TRANSITIONS[from].includes(to);
}
export const jobStatusLabels: Record<JobStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};
export const employmentLabels = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};
export function formatSalary(
  min: number | null,
  max: number | null,
  locale: Locale = "en",
) {
  const t = createTranslator(locale);
  const format = (value: number) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US").format(value);
  if (min !== null && max !== null) return `${format(min)}–${format(max)}`;
  if (min !== null) return t("From {amount}", { amount: format(min) });
  if (max !== null) return t("Up to {amount}", { amount: format(max) });
  return t("Salary not specified");
}
