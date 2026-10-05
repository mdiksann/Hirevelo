import { Badge } from "@/components/ui/badge";
import { jobStatusLabels } from "@/lib/jobs";
import type { JobStatus } from "@/lib/validation/jobs";
const styles: Record<JobStatus, string> = {
  DRAFT: "border-border bg-surface text-[var(--hv-tag-ink)]",
  PUBLISHED: "bg-[var(--hv-success-tint)] text-[var(--hv-success-ink)]",
  CLOSED: "bg-[var(--hv-surface-cell)] text-ink-body",
  ARCHIVED: "bg-[var(--hv-surface-active)] text-subtle",
};
export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={`h-[22px] px-[9px] font-semibold ${styles[status]}`}>
      {jobStatusLabels[status]}
    </Badge>
  );
}
