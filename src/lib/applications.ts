import type { Stage } from "@/lib/validation/applications";
export const stageLabels: Record<Stage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFERING: "Offering",
  HIRED: "Hired",
  REJECTED: "Rejected",
};
export const stageStyles: Record<Stage, string> = {
  APPLIED: "bg-[var(--hv-surface-active)] text-ink-body",
  SCREENING: "bg-[var(--hv-accent-soft)] text-accent-ink",
  INTERVIEW: "bg-[var(--hv-warning-tint)] text-[var(--hv-warning-ink)]",
  OFFERING: "bg-[var(--hv-success-tint)] text-[var(--hv-success-ink)]",
  HIRED: "bg-[var(--hv-success-solid)] text-white",
  REJECTED: "bg-[var(--hv-danger-solid)] text-white",
};
