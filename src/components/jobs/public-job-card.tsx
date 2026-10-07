"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { employmentLabels, formatSalary } from "@/lib/jobs";
import { formatDate } from "@/lib/utils";
import type { JobDto } from "@/lib/queries/jobs";
export function PublicJobCard({ job }: { job: JobDto }) {
  const t = useTranslator();
  return (
    <li className="public-job-card border-b border-border-subtle last:border-0">
      <Link
        href={`/careers/${job.slug}`}
        className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-5 py-3 hover:bg-surface-subtle"
      >
        <div>
          <h2 className="text-[length:var(--hv-text-title)] font-semibold">
            {job.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.location} · {t(employmentLabels[job.employmentType])}
            {job.publishedAt &&
              t(" · Posted {date}", {
                date: formatDate(job.publishedAt, t.locale),
              })}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(formatSalary(job.salaryMin, job.salaryMax, t.locale))}
        </p>
      </Link>
    </li>
  );
}
