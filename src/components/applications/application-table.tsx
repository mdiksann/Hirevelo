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
import type { ApplicationDto } from "@/lib/queries/applications";
export function ApplicationTable({
  applications,
}: {
  applications: ApplicationDto[];
}) {
  return (
    <div className="rounded-panel border border-border-subtle bg-surface">
      <Table>
        <TableCaption className="sr-only">My applications</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Job</TableHead>
            <TableHead scope="col">Stage</TableHead>
            <TableHead scope="col" className="hidden md:table-cell">
              Applied
            </TableHead>
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
                  href={`/applications/${row.id}`}
                  className="font-semibold text-accent-ink"
                >
                  {row.job.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {row.job.location}
                </p>
                <p className="text-xs text-muted-foreground md:hidden">
                  Applied {formatDate(row.appliedAt)}
                </p>
              </TableCell>
              <TableCell>
                <StageBadge stage={row.stage} />
              </TableCell>
              <TableCell className="hidden md:table-cell tabular-nums">
                {formatDate(row.appliedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
