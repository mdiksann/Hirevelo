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
import { StageBadge } from "@/components/applications/stage-badge";
import { formatDate } from "@/lib/utils";
import type { RecruiterApplicationDto } from "@/lib/queries/applications";
export function CandidateTable({
  applications,
}: {
  applications: RecruiterApplicationDto[];
}) {
  const t = useTranslator();
  return (
    <div className="rounded-panel border border-border-subtle bg-surface">
      <Table>
        <TableCaption className="sr-only">
          {t("Candidate applications")}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {["Candidate", "Stage", "Job", "Applied", "Last activity"].map(
              (label, index) => (
                <TableHead
                  key={label}
                  scope="col"
                  className={index > 1 ? "hidden md:table-cell" : undefined}
                >
                  {t(label)}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((row) => (
            <TableRow
              key={row.id}
              className="h-14 border-border-subtle [&>td]:p-3 hover:bg-[var(--hv-surface-raised)]"
            >
              <TableCell className="whitespace-normal">
                <Link
                  href={`/recruiter/candidates/${row.id}`}
                  className="font-semibold text-accent-ink"
                >
                  {row.candidate.name}
                </Link>
                <p className="break-all text-xs text-muted-foreground">
                  {row.candidate.email}
                </p>
                <dl className="mt-2 text-xs text-muted-foreground md:hidden">
                  <dt>{t("Job")}</dt>
                  <dd>
                    <Link
                      href={`/recruiter/jobs/${row.job.id}`}
                      className="text-accent-ink"
                    >
                      {row.job.title}
                    </Link>
                  </dd>
                  <dt>{t("Applied")}</dt>
                  <dd>{formatDate(row.appliedAt, t.locale)}</dd>
                  <dt>{t("Last activity")}</dt>
                  <dd>{formatDate(row.lastActivityAt, t.locale)}</dd>
                </dl>
              </TableCell>
              <TableCell>
                <StageBadge stage={row.stage} />
              </TableCell>
              <TableCell className="hidden md:table-cell whitespace-normal">
                <Link
                  href={`/recruiter/jobs/${row.job.id}`}
                  className="text-accent-ink"
                >
                  {row.job.title}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell tabular-nums">
                {formatDate(row.appliedAt, t.locale)}
              </TableCell>
              <TableCell className="hidden md:table-cell tabular-nums">
                {formatDate(row.lastActivityAt, t.locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
