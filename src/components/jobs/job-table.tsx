"use client";
import { useTranslator } from "@/components/i18n/language-provider";
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
  const t = useTranslator();
  return (
    <div className="rounded-panel border border-border-subtle bg-surface">
      <Table>
        <TableCaption className="sr-only">{t("Recruiter jobs")}</TableCaption>
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
                {t(label)}
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
                    <dt className="inline">{t("Applicants: ")}</dt>
                    <dd className="inline">
                      <Link
                        href={`/recruiter/candidates?jobId=${job.id}`}
                        className="text-accent-ink"
                        aria-label={t("View applicants for {title}", {
                          title: job.title,
                        })}
                      >
                        {job.applicantsCount}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">{t("Location")}</dt>
                    <dd>{job.location}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t("Updated: ")}</dt>
                    <dd className="inline">
                      {formatDate(job.updatedAt, t.locale)}
                    </dd>
                  </div>
                </dl>
              </TableCell>
              <TableCell>
                <JobStatusBadge status={job.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Link
                  href={`/recruiter/candidates?jobId=${job.id}`}
                  className="text-accent-ink"
                  aria-label={t("View applicants for {title}", {
                    title: job.title,
                  })}
                >
                  {job.applicantsCount}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {job.location}
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {formatDate(job.updatedAt, t.locale)}
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
