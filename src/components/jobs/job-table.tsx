import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobRowActions } from "@/components/jobs/job-row-actions";
import { cn, formatDate } from "@/lib/utils";
import type { RecruiterJobDto } from "@/lib/queries/jobs";
export function JobTable({ jobs }: { jobs: RecruiterJobDto[] }) {
  return (
    <div className="rounded-panel border border-border-subtle bg-surface">
      <Table>
        <TableCaption className="sr-only">Recruiter jobs</TableCaption>
        <TableHeader>
          <TableRow className="border-border-subtle hover:bg-surface">
            {[
              "Job",
              "Status",
              "Applicants",
              "Location",
              "Updated",
              "Actions",
            ].map((label, index) => (
              <TableHead
                key={label}
                scope="col"
                className={cn(
                  "px-3 text-xs text-subtle",
                  index > 1 && index < 5 && "hidden md:table-cell",
                )}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              className="h-14 border-border-subtle [&>td]:p-3 hover:bg-[var(--hv-surface-raised)]"
            >
              <TableCell className="whitespace-normal">
                <Link
                  href={`/recruiter/jobs/${job.id}`}
                  className="font-semibold"
                >
                  {job.title}
                </Link>
                <dl className="mt-2 space-y-1 text-xs text-muted-foreground md:hidden">
                  <div>
                    <dt className="inline">Applicants: </dt>
                    <dd className="inline">{job.applicantsCount}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Location</dt>
                    <dd>{job.location}</dd>
                  </div>
                  <div>
                    <dt className="inline">Updated: </dt>
                    <dd className="inline">{formatDate(job.updatedAt)}</dd>
                  </div>
                </dl>
              </TableCell>
              <TableCell>
                <JobStatusBadge status={job.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {job.applicantsCount}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {job.location}
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {formatDate(job.updatedAt)}
              </TableCell>
              <TableCell className="text-right">
                <JobRowActions
                  id={job.id}
                  title={job.title}
                  archived={job.status === "ARCHIVED"}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
